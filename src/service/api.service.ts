var BN = require('bn.js');
var numberToBN = require('number-to-bn');
import _ from 'lodash';
import { bufferToInt, unpadHexString } from 'ethereumjs-util';
import WebSocket from 'ws';
import crypto from 'crypto';
import Antenna from 'iotex-antenna';
import { fromString, fromBytes } from 'iotex-antenna/lib/crypto/address';
import { IBlockMeta, IGetLogsRequest, ITopics, IBlockHeader, IBlockHeaderCore, ClientReadableStream, IStreamBlocksResponse, IStreamLogsResponse } from 'iotex-antenna/lib/rpc-method/types';
import BaseService from './base.service';
import { Exception } from '@common/exceptions';
import { Code } from '@common/enums';
import { END_POINT, CHAIN_ID, PROJECT } from '@config/env';
import { redisHelper } from '@helpers/redis';
import { logger } from '@common/utils';

const publicKeyToAddress = require('ethereum-public-key-to-address');

type Stream = ClientReadableStream<IStreamBlocksResponse> | ClientReadableStream<IStreamLogsResponse>;

const DEFAULT_CALLER = 'io1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7';
const antenna = new Antenna(END_POINT);

function removePrefix(content: string) {
  return (content.startsWith('0x') || content.startsWith('0X')) ? content.slice(2) : content;
}

function toEth(address: string) {
  if (_.size(address) == 0)
    return '0x0000000000000000000000000000000000000000';

  const a = fromString(address);
  return a.stringEth();
}

function fromEth(address: string) {
  if (address.startsWith('0x'))
    address = address.substring(2);

  const bytes = Buffer.from(address, 'hex');
  const a = fromBytes(bytes);
  return a.string();
}

function toBN(v: number | string) {
  return numberToBN(_.isNil(v) ? 0 : v);
}

function bufferToHex(v: Buffer | {}) {
  return '0x' + (_.isNil(v) ? '' : v.toString('hex'));
}

function numberToHex(v: number | string) {
  const n = toBN(v);
  const result = n.toString(16);
  return n.lt(new BN(0)) ? '-0x' + result.substr(1) : '0x' + result;
} 

function toString(v: number | string) {
  return toBN(v).toString(16);
}

function toNumber(v: number | string) {
  return toBN(v).toNumber();
}

function translateTopics(topics: any[]): Array<ITopics> {
  return topics.map(v => {
    const ret: ITopics = { topic: [] };
    if (typeof(v) == 'string' && v.startsWith('0x')) {
      ret.topic.push(Buffer.from(v.slice(2), 'hex'));
    } else if (_.isArray(v)) {
      ret.topic = v.map(x => Buffer.from(x.slice(2), 'hex'));
    }

    return ret;
  });
}

function createHash(content: string | object) {
  if (typeof(content) == 'object')
    content = JSON.stringify(content);

  return '0x' + crypto.createHash('sha1').update(content).digest('hex');
}

class ApiService extends BaseService {

  public async getChainId(params: any[]) {
    return numberToHex(CHAIN_ID);
  }

  public async getBlockNumber(params: any[]) {
    const ret = await antenna.iotx.getChainMeta({});
    const n =  _.get(ret, 'chainMeta.height', 0);
    return numberToHex(n);
  }

  public async getAccounts(params: any[]) {
    return [];
  }

  public async getBalance(params: any[]) {
    const [ address ] = params;
    const ret = await antenna.iotx.getAccount({ address: fromEth(address) });
    const b = _.get(ret, 'accountMeta.balance', 0);
    return numberToHex(b);
  }

  public async gasPrice(params: any) {
    const { gasPrice } = await antenna.iotx.suggestGasPrice({});
    return numberToHex(gasPrice);
  }

  public async getTransactionCount(params: any[]) {
    const [ address, block_id ] = params;
    const ret = await antenna.iotx.getAccount({ address: fromEth(address) });
    const b = _.get(ret, 'accountMeta.pendingNonce', 0);
    return numberToHex(b);
  }

  public async sendRawTransaction(params: any[]) {
    const [ data ] = params;
    const ret = await antenna.iotx.sendRawTransaction({ chainID: CHAIN_ID, data });
    return _.startsWith(ret, '0x') ? ret : ('0x' + ret);
  }

  public async call(params: any[]) {
    const [ tx ] = params;
    const { from, to, data, value, gas, gasPrice } = tx;
    if (to == '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39')
      return;

    const d = Buffer.from(data.slice(2), 'hex');
    try {
      const { data: ret } = await antenna.iotx.readContract({
        execution: {
          amount: toBN(value).toString(10),
          contract: fromEth(to),
          data: d
        },
        callerAddress: (from ? fromEth(from) : DEFAULT_CALLER),
        gasLimit: toBN(gas).toString(10),
        gasPrice: gasPrice ? toBN(gasPrice).toString(10) : ''
      });
      return _.startsWith(ret, '0x') ? ret : ('0x' + ret);
    } catch (e) {
      throw new Exception(Code.SERVER_ERROR, e.toString());
    }
  }

  public async estimateGas(params: any[]) {
    const [ tx ] = params;
    const { to, data, from, value } = tx;

    const ret = await antenna.iotx.estimateGas({ from, to, value, data });
    return numberToHex(ret);
  }

  public async getCode(params: any[]) {
    const [ address, block_id ] = params;
    const ret = await antenna.iotx.getAccount({ address: fromEth(address) });
    const code = _.get(ret, 'accountMeta.contractByteCode');
    return bufferToHex(code);
  }

  public async getNetworkId(params: any) {
    return `${CHAIN_ID}`;
  }

  public async getPeers(params: any) {
    return [];
  }

  public async getTransactionReceipt(params: any) {
    const [ h ] = params;
    const hash = removePrefix(h);

    let ret;
    try {
      ret = await antenna.iotx.getReceiptByAction({ actionHash: hash });
    } catch (e) {
      return null;
    }

    const { receiptInfo } = ret;
    const { receipt, blkHash } = receiptInfo || {};
    const { status, blkHeight, actHash, gasConsumed, contractAddress, logs = [] } = receipt || {};
    const height = numberToHex(blkHeight || 0);

    let transaction: any;
    try {
      const action = await antenna.iotx.getActions({ byHash: { actionHash: removePrefix(params[0]), checkPending: true } });
      transaction = this.transaction(action.actionInfo[0]);
    } catch (e) {
      return null;
    }

    if (!transaction)
      return null;

    return {
      blockHash: '0x' + blkHash,
      blockNumber: height,
      contractAddress: (_.size(contractAddress) > 0  ? toEth(contractAddress || '') : null),
      cumulativeGasUsed: numberToHex(gasConsumed || 0),
      from: transaction.from,
      gasUsed: numberToHex(gasConsumed || 0),
      logs: logs.map(v => ({
        blockHash: '0x' + blkHash,
        transactionHash: '0x' + hash,
        transactionIndex: _.get(transaction, 'transactionIndex', 0),
        logIndex: numberToHex(v.index),
        blockNumber: numberToHex(v.blkHeight),
        address: toEth(v.contractAddress),
        data: bufferToHex(v.data),
        topics: v.topics.map(v => bufferToHex(v))
      })),
      logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      status: numberToHex(status == 1 ? 1 : 0),
      to: transaction.to,
      transactionHash: '0x' + hash,
      transactionIndex: transaction.transactionIndex
    };
  }

  public async notImplememted(params: any) {
    throw new Exception(Code.NOT_IMPLEMENTED, 'function not implemented');
  }

  public async getNodeInfo(params: any) {
    const { serverMeta } = await antenna.iotx.getServerMeta({});
    return `${_.get(serverMeta, 'packageVersion')}/${_.get(serverMeta, 'goVersion')}`;
  }

  public async getPeerCount(params: any) {
    return '0x64';
  }

  public async isListening(params: any) {
    return true;
  }

  public async getProtocolVersion(params: any) {
    return '64';
  }

  public async isSyncing(params: any) {
    return false;
  }

  public async getCoinbase(params: any) {
    return this.notImplememted(params);
  }

  public async isMining(params: any) {
    return false;
  }

  public async getHashrate(params: any) {
    return '0x500000';
  }

  private async blockByHash(hash: string): Promise<IBlockMeta | undefined> {
    try {
      const ret = await antenna.iotx.getBlockMetas({ byHash: { blkHash: hash } });
      return _.get(ret, 'blkMetas[0]');
    } catch (e) {
      return undefined;
    }
  }
  
  private async blockById(id: number): Promise<IBlockMeta | undefined> {
    try {
      const ret = await antenna.iotx.getBlockMetas({ byIndex: { start: id, count: 1 } });
      return _.get(ret, 'blkMetas[0]');
    } catch (e) {
      return undefined;
    }
  }

  public async getBlockTransactionCountByHash(params: any) {
    const b = await this.blockByHash(removePrefix(params[0]));
    return numberToHex(b?.numActions || 0);
  }

  public async getBlockTransactionCountByNumber(params: any) {
    const b = await this.blockById(params[0]);
    return numberToHex(b?.numActions || 0);
  }

  private async getBlockWithTransaction(b: IBlockMeta, detail: boolean) {
    let transactions: any = [];
    const height = numberToHex(b.height);
    let transactionsRoot: string = '0x';

    if (Number(b.height) > 0) {
      const { hash } = b;
      const ret = await antenna.iotx.getActions({
        byBlk: { blkHash: hash, start: 0, count: 1000 }
      });

      const actions = ret.actionInfo || [];

      if (detail) {
        const self = this;
        transactions = actions.map(v => self.transaction(v)).filter(v => v != null);
      } else {
        transactions = actions.map(v => '0x' + v.actHash);
      }

      transactionsRoot = '0x' + b.txRoot;
    }

    if (_.isEmpty(transactions))
      transactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

    let bloom = (<any>b).logsBloom;
    if (_.size(bloom) == 0)
      bloom = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    return {
      author: toEth(b.producerAddress),
      difficulty: '0xfffffffffffffffffffffffffffffffe',
      extraData: '0x',
      gasLimit: numberToHex(b.gasLimit),
      gasUsed: numberToHex(b.gasUsed),
      hash: '0x' + b.hash,
      logsBloom: '0x' + bloom,
      miner: toEth(b.producerAddress),
      number: height,
      parentHash: '0x' + (<any>b).previousBlockHash,
      receiptsRoot: '0x' + b.txRoot,
      sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
      signature: "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      size: numberToHex(b.numActions),
      stateRoot: '0x' + b.deltaStateDigest,
      step: '373422302',
      timestamp: numberToHex(b.timestamp.seconds),
      totalDifficulty: '0xff14700000000000000000000000486001d72',
      transactions,
      transactionsRoot,
      uncles: []
    };
  }

  public async getBlockByNumber(params: any[]) {
    const [ block_id, detail = false ] = params;

    let bid = block_id;
    if (block_id == 'latest' || block_id == '0xNaN' || block_id == 'pending') {
      const ret = await antenna.iotx.getChainMeta({});
      bid = toNumber(_.get(ret, 'chainMeta.height', 0));
    } else {
      bid = toNumber(block_id);
    }

    const b = await this.blockById(bid);
    if (!b)
      return null;

    return this.getBlockWithTransaction(b, detail);
  }

  public async getBlockByHash(params: any) {
    const [ blkHash, detail = false ] = params;
    const b = await this.blockByHash(removePrefix(blkHash));
    if (!b)
      return null;

    return this.getBlockWithTransaction(b, detail);
  }

  private transaction(ret: any): any {
    const { action, actHash, blkHash, blkHeight, sender, index } = ret;
    const { core, senderPubKey, signature } = action;
    const { nonce, gasLimit, gasPrice, transfer, execution } = core;

    let value = '0x0';
    let to;
    let data = '0x';
    if (transfer != null) {
      const { amount, recipient } = transfer;
      value = numberToHex(amount);
      to = toEth(recipient);
    } else if (execution != null) {
      const { amount, contract, data: d } = execution;
      value = numberToHex(amount);
      to = _.size(contract) > 0 ? toEth(contract) : null;
      data = bufferToHex(d);
    } else {
      return null;
    }

    const r = '0x' + unpadHexString(bufferToHex(signature.slice(0, 32)));
    const s = '0x' + unpadHexString(bufferToHex(signature.slice(32, 64)));
    let vi = bufferToInt(signature.slice(64));
    if (vi < 27)
      vi += 27;

    const v = numberToHex(vi);
    const nilBlock = blkHeight == 0;

    return {
      blockHash: nilBlock ? null : `0x${blkHash}`,
      blockNumber: nilBlock? null : numberToHex(blkHeight),
      chainId: numberToHex(CHAIN_ID),
      condition: null,
      creates: null,
      from: toEth(sender),
      gas: numberToHex(gasLimit),
      gasPrice: numberToHex(gasPrice),
      hash: `0x${actHash}`,
      input: data,
      nonce: numberToHex(nonce),
      publicKey: bufferToHex(senderPubKey),
      r,
      s,
      standardV: v,
      v,
      to,
      transactionIndex: numberToHex(index),
      value
    };
  }

  private async getTransactionCreates(data: any) {
    const transaction = this.transaction(data);
    if (!transaction)
      return null;

    if (transaction.to != null || transaction.blockHash == null)
      return transaction;

      let ret;
      try {
        ret = await antenna.iotx.getReceiptByAction({ actionHash: transaction.hash.slice(2) });
      } catch (e) {
        return null;
      }

      transaction.creates = toEth(_.get(ret, 'receiptInfo.receipt.contractAddress'));
      return transaction;
  }

  public async getTransactionByHash(params: any) {
    try {
      const ret = await antenna.iotx.getActions({ byHash: { actionHash: removePrefix(params[0]), checkPending: true } });
      return this.getTransactionCreates(ret.actionInfo[0]);
    } catch (e) {
      return null;
    }
  }

  public async getTransactionByBlockHashAndIndex(params: any) {
    const [ blkHash, id ] = params;
    try {
      const ret = await antenna.iotx.getActions({ byBlk: { blkHash: removePrefix(blkHash), start: id, count: 1 } });
      return this.getTransactionCreates(ret.actionInfo[0]);
    } catch (e) {
      return null;
    }
  }

  public async getTransactionByBlockNumberAndIndex(params: any) {
    const [ blkId, id ] = params;
    const b = await this.blockById(blkId);
    if (!b)
      return {};

    try {
      const ret = await antenna.iotx.getActions({ byBlk: { blkHash: b.hash, start: id, count: 1 } });
      return this.getTransactionCreates(ret.actionInfo[0]);
    } catch (e) {
      return null;
    }
  }

  public async getPendingTransactions(params: any) {
    return this.notImplememted(params);
  }

  public async getLogs(params: any) {
    const { fromBlock = 'latest', toBlock = 'latest', topics = [], address = [] } = params[0];
    const args: IGetLogsRequest = { filter: { address: [], topics: [] } };
    const predefined = [ 'latest', 'pending' ];
    let from = 0;
    let to = 0;

    if (predefined.includes(fromBlock) || predefined.includes(toBlock)) {
      const meta = await antenna.iotx.getChainMeta({});
      const height = toNumber(_.get(meta, 'chainMeta.height', 0));
      if (predefined.includes(fromBlock))
        from = height;
      if (predefined.includes(toBlock))
        to = height;
    }

    if (fromBlock == 'earliest')
      from = 1;

    if (toBlock == 'earliest')
      to = 1;
    
    if (typeof(fromBlock) == 'string' && fromBlock.startsWith('0x'))
      from = toNumber(fromBlock);

    if (typeof(toBlock) == 'string' && toBlock.startsWith('0x'))
      to = toNumber(toBlock);

    if (from > 0 || to > 0)
      args.byRange = { fromBlock: from, toBlock: to, paginationSize: 1000, count: 0 };

    if (!_.isNil(address)) {
      const addresses = (_.isArray(address) ? address : [ address ]);
      args.filter.address = addresses.map(v => fromEth(v));
    }

    if (!_.isNil(topics))
      args.filter.topics = translateTopics(topics);

    const ret = await antenna.iotx.getLogs(args);
    const logs = ret.logs || [];

    return logs.filter(v => v.topics.length > 0).map(v => ({
      blockHash: bufferToHex(v.blkHash),
      transactionHash: bufferToHex(v.actHash),
      logIndex: numberToHex(v.index),
      blockNumber: numberToHex(v.blkHeight),
      transactionIndex: '0x1',
      address: toEth(v.contractAddress),
      data: bufferToHex(v.data),
      topics: v.topics.map(v => bufferToHex(v))
    }));
  }

  public async newFilter(params: any) {
    const { fromBlock = 'latest', toBlock = 'latest', topics = [], address = [] } = params[0];
    const key = createHash({
      fromBlock,
      toBlock,
      topics,
      address,
      rand: _.random(100000, 999999),
      ts: Date.now(),
      type: 0
    });

    const timeout = 15 * 60;
    await redisHelper.setex(`${PROJECT}:FILTER:${key}`, JSON.stringify({ fromBlock, toBlock, topics, address, type: 0 }), timeout);
    await redisHelper.setex(`${PROJECT}:FILTER_HEIGHT:${key}`, '1', timeout + 1);
    return key;
  }

  public async newBlockFilter(params: any) {
    const key = createHash({
      rand: _.random(100000, 999999),
      ts: Date.now(),
      type: 1
    });

    const ret = await antenna.iotx.getChainMeta({});
    const blockHeight =  _.get(ret, 'chainMeta.height', 0);

    const timeout = 15 * 60;
    await redisHelper.setex(`${PROJECT}:FILTER:${key}`, JSON.stringify({ type: 1 }), timeout);
    await redisHelper.setex(`${PROJECT}:FILTER_HEIGHT:${key}`, `${blockHeight}`, timeout + 1);
    return key;
  }

  public async uninstallFilter(params: any) {
    const [ id ] = params;
    const ret = await redisHelper.del(`${PROJECT}:FILTER:${id}`);
    return ret === '1';
  }

  public async getFilterChanges(params: any) {
    const [ id ] = params;
    const meta = await antenna.iotx.getChainMeta({});
    const blockHeight =  _.get(meta, 'chainMeta.height', 0);

    const key = `${PROJECT}:FILTER:${id}`;
    const s = await redisHelper.get(key);

    let filter;
    try {
      filter = JSON.parse(s || '');
    } catch (e) {
      return [];
    }

    const { type } = filter;
    const keyHeight = `${PROJECT}:FILTER_HEIGHT:${id}}`;
    const h = await redisHelper.get(keyHeight);
    const height = _.defaultTo(Number(h), 0) + 1;
    let ret: any[] = [];
    let end = 0;

    if (height > blockHeight)
      return [];

    if (type == 0) {
      ret = await this.getLogs([ { ..._.pick(filter, ['topics', 'address']), fromBlock: numberToHex(height), toBlock: numberToHex(blockHeight) } ]);
      end = blockHeight;
    } else if (type == 1) {
      const metas = await antenna.iotx.getBlockMetas({ byIndex: { start: height, count: 1000 } });
      ret = metas.blkMetas.map(v => '0x' + v.hash);
      end = _.min([ height + 1000, blockHeight ]);
    }

    const timeout = 15 * 60;
    await redisHelper.expire(key, timeout);
    await redisHelper.setex(keyHeight, `${end}`, timeout + 1);

    return ret;
  }

  public async getFilterLogs(params: any) {
    const [ id ] = params;
    const key = `${PROJECT}:FILTER:${id}`;
    const s = await redisHelper.get(key);

    let filter;
    try {
      filter = JSON.parse(s || '');
    } catch (e) {
      return [];
    }

    const { type } = filter;
    if (type == 0) {
      return this.getLogs([ _.pick(filter, ['topics', 'address', 'fromBlock', 'toBlock' ]) ]);
    } else if (type == 1) {
      const keyHeight = `${PROJECT}:FILTER_HEIGHT:${id}}`;
      const h = await redisHelper.get(keyHeight);
      const height = _.defaultTo(Number(h), 0) + 1;
      const metas = await antenna.iotx.getBlockMetas({ byIndex: { start: height, count: 1000 } });
      return metas.blkMetas.map(v => '0x' + v.hash); 
    }
  }

  public async subscribe(params: any, ws: WebSocket) {
    if (_.isNil(ws)) return null;

    const [ title ] = params;
    if (title == 'newHeads') {
      return this.subscribeBlock(ws);
    } else if (title == 'logs') {
      return this.subscribeLogs(ws, params[1]);
    }
  }

  public async unsubscribe(params: any, ws: WebSocket) {
    const [ subscription ] = params;
    const stream = this.getStream(ws, subscription);
    if (stream) {
      this.removeStream(ws, subscription);
      stream.cancel();
      return true;
    }

    return false;
  }

  public closeConnection(ws: WebSocket) {
    if (_.isNil(ws)) return;

    const subscribes: {[key: string]: Stream} = (<any>ws).subscribes || {};
    _.forEach(subscribes, (v: Stream) => v.cancel());
    (<any>ws).subscribes = null;
  }

  private addStream(ws: WebSocket, subscribe: string, stream: Stream) {
    if (ws == null) return;

    const subscribes: {[key: string]: Stream} = (<any>ws).subscribes || {};
    if (_.isNil((<any>ws).subscribes))
      (<any>ws).subscribes = subscribes;
      
    subscribes[subscribe] = stream;
  }

  private getStream(ws: WebSocket, subscribe: string) {
    const subscribes: {[key: string]: Stream} = (<any>ws).subscribes || {};
    return subscribes[subscribe] || null;
  }

  private removeStream(ws: WebSocket, subscribe: string) {
    if (_.isNil(ws)) return;

    const subscribes: {[key: string]: Stream} = (<any>ws).subscribes || {};
    if (subscribes[subscribe])
      delete subscribes[subscribe];
  }

  private async subscribeBlock(ws: WebSocket) {
    const subscription = createHash({
      rand: _.random(100000, 999999),
      ts: Date.now(),
      type: 2
    });

    const stream = antenna.iotx.streamBlocks({});
    this.addStream(ws, subscription, stream);
    stream.on('data', response => {
      const header: IBlockHeader = _.get(response, 'block.block.header');
      const { producerPubkey, signature } = header;
      const {
        height = 0,
        timestamp,
        prevBlockHash,
        txRoot,
        deltaStateDigest,
        receiptRoot,
        logsBloom
      } = header.core as IBlockHeaderCore;

      const hash = response.blockIdentifier?.hash;
      const miner = publicKeyToAddress(producerPubkey.toString('hex'));
      const ret = {
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          result: {
            number: numberToHex(height),
            hash: '0x' + hash,
            parentHash: bufferToHex(prevBlockHash),
            sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
            logsBloom: bufferToHex(logsBloom),
            transactionsRoot: bufferToHex(txRoot),
            stateRoot: bufferToHex(deltaStateDigest),
            receiptsRoot: bufferToHex(receiptRoot),
            miner,
            author: miner,
            difficulty: '0xfffffffffffffffffffffffffffffffe',
            extraData: '0xdb830302058c4f70656e457468657265756d86312e35312e30826c69',
            size: '0x100',
            gasLimit: '0x0',
            gasUsed: '0x0',
            timestamp: numberToHex(timestamp?.seconds || 0),
            step: '373422302',
            signature: signature.toString('hex')
          },
          subscription
        }
      };

      try {
        ws.send(JSON.stringify(ret));
      } catch (e) {
        logger.error('ws send failed', e);
      }
    });

    stream.on('error', e => stream.cancel());
    stream.on('end', () => logger.info('stream end'));

    return subscription;
  }

  private async subscribeLogs(ws: WebSocket, params: any) {
    const { address = [], topics = [] } = params;
    
    const subscription = createHash({
      rand: _.random(100000, 999999),
      ts: Date.now(),
      type: 3
    });

    const stream = antenna.iotx.streamLogs({
      filter: {
        address: (_.isArray(address) ? address : [ address ]).map(v => fromEth(v)),
        topics: translateTopics(topics)
      }
    });

    this.addStream(ws, subscription, stream);
    stream.on('data', response => {
      const log = response.log;
      if (!log)
        return;

      const { contractAddress, topics, data, blkHeight, actHash, index, blkHash } = log;
      const ret = {
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          result: {
            address: toEth(contractAddress),
            blockHash: bufferToHex(blkHash),
            blockNumber: numberToHex(blkHeight),
            data: bufferToHex(data),
            logIndex: numberToHex(index),
            topics: topics.map(v => bufferToHex(v)),
            transactionHash: bufferToHex(actHash),
            transactionIndex: '0x0'
          },
          subscription
        }
      };

      try {
        ws.send(JSON.stringify(ret));
      } catch (e) {
        logger.error('ws send failed', e);
      }
    });

    stream.on('error', e => stream.cancel());
    stream.on('end', () => logger.info('stream end'));

    return subscription;
  }

}

export const apiService = new ApiService();
