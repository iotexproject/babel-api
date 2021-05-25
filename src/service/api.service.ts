var BN = require('bn.js');
var numberToBN = require('number-to-bn');
import _ from 'lodash';
import crypto from 'crypto';
import Antenna from 'iotex-antenna';
import { fromString, fromBytes } from 'iotex-antenna/lib/crypto/address';
import { hash160b } from 'iotex-antenna/lib/crypto/hash';
import { IBlockMeta, IGetLogsRequest, ITopics } from 'iotex-antenna/lib/rpc-method/types';
import BaseService from './base.service';
import { Exception } from '@common/exceptions';
import { Code } from '@common/enums';
import { END_POINT, CHAIN_ID, PROJECT } from '@config/env';
import { redisHelper } from '@helpers/redis';

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

  return crypto.createHash('sha1').update(content).digest('hex');
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
    return '0x' + ret;
  }

  public async call(params: any[]) {
    const [ tx ] = params;
    const { to, data } = tx;
    const address = fromEth(to);

    if (to == '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39')
      return;

    const d = Buffer.from(data.slice(2), 'hex');

    const { data: ret } = await antenna.iotx.readContract({
      execution: {
        amount: '0',
        contract: address,
        data: d
      },
      callerAddress: address
    });

    return '0x' + ret;
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
    return '0x' + (_.isNil(code) ? '' : code.toString('hex'));
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
      const action = await antenna.iotx.getActions({ byHash: { actionHash: removePrefix(params[0]), checkingPending: true } });
      transaction = this.transaction(action);
    } catch (e) {
      return null;
    }

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
        data: '0x' + v.data.toString('hex'),
        topics: v.topics.map(v => '0x' + v.toString('hex'))
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
    const ret = await antenna.iotx.getBlockMetas({ byHash: { blkHash: hash } });
    return _.get(ret, 'blkMetas[0]');
  }
  
  private async blockById(id: number): Promise<IBlockMeta | undefined> {
    const ret = await antenna.iotx.getBlockMetas({ byIndex: { start: id, count: 1 } });
    return _.get(ret, 'blkMetas[0]');
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
        transactions = actions.map((v, k) => {
          const { action } = v;
          const transfer = _.get(action, 'core.transfer');
          const execution = _.get(action, 'core.execution');
          let to = _.get(transfer, 'recipient') || _.get(execution, 'contract');
          if (_.size(to) > 0)
            to = toEth(to);

          const value = numberToHex(_.get(transfer || execution, 'amount', 0));
          let data = _.get(transfer, 'payload') || _.get(execution, 'data');
          if (!_.isNil(data))
            data = '0x' + data.toString('hex');
          else
            data = '0x';

          const from = '0x' + hash160b(v.action.senderPubKey).toString('hex');
          const pub = v.action.senderPubKey as Buffer;
          const pubkey = pub.toString('hex');
          return {
            blockHash: '0x' + v.blkHash,
            blockNumber: height,
            chainId: null,
            condition: null,
            creates: null, // contract address if is contract creation
            from,
            gas: numberToHex(_.get(action, 'core.gasLimit', 0)),
            gasPrice: numberToHex(_.get(action, 'core.gasPrice', 0)),
            hash: '0x' + v.actHash,
            input: data,
            nonce: numberToHex(_.get(action, 'core.nonce', 0)),
            publicKey: '0x' + pubkey,
            r: '0x0',
            v: '0x0',
            s: '0x0',
            standardV: '0x1',
            to,
            transactionIndex: numberToHex(k),
            value
          };
        });
      } else {
        transactions = actions.map(v => '0x' + v.actHash);
      }

      transactionsRoot = '0x' + b.txRoot;
    } else {
      transactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
    }

    let bloom = (<any>b).logsBloom;
    if (_.size(bloom) == 0)
      bloom = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    return {
      author: toEth(b.producerAddress),
      difficulty: '0xfffffffffffffffffffffffffffffffe',
      extraData: '0x',
      // @ts-ignore
      gasLimit: numberToHex(b.gasLimit),
      // @ts-ignore
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
    if (block_id == 'latest' || block_id == '0xNaN') {
      const ret = await antenna.iotx.getChainMeta({});
      bid = toNumber(_.get(ret, 'chainMeta.height', 0));
    } else {
      bid = toNumber(block_id);
    }

    const b = await this.blockById(bid);
    if (!b)
      return {};

    return this.getBlockWithTransaction(b, detail);
  }

  public async getBlockByHash(params: any) {
    const [ blkHash, detail = false ] = params;
    const b = await this.blockByHash(removePrefix(blkHash));
    if (!b)
      return {};

    return this.getBlockWithTransaction(b, detail);
  }

  private transaction(ret: any): any {
    const { actionInfo } = ret;
    const { action, actHash, blkHash, blkHeight, sender, index } = actionInfo[0];
    const { core, senderPubKey, signature } = action;
    const { nonce, gasLimit, gasPrice, transfer, execution } = core;

    let value = '0x0';
    let to;
    let data = '';
    if (transfer != null) {
      const { amount, recipient } = transfer;
      value = numberToHex(amount);
      to = toEth(recipient);
    } else if (execution != null) {
      const { amount, contract, data: d } = execution;
      value = numberToHex(amount);
      to = _.size(contract) > 0 ? toEth(contract) : null;
      data = `0x${d.toString('hex')}`;
    }

    return {
      blockHash: `0x${blkHash}`,
      blockNumber: numberToHex(blkHeight),
      chainId: null,
      condition: null,
      creates: null,
      from: toEth(sender),
      gas: numberToHex(gasLimit),
      gasPrice: numberToHex(gasPrice),
      hash: `0x${actHash}`,
      input: data,
      nonce: numberToHex(nonce),
      publicKey: '0x' + senderPubKey,
      r: '0x',
      raw: '0x',
      s: '0x',
      standardV: '0x1',
      to,
      transactionIndex: numberToHex(index),
      value
    };
  }

  private async getTransactionCreates(data: any) {
    const transaction = this.transaction(data);
    if (transaction.to != null)
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
      const ret = await antenna.iotx.getActions({ byHash: { actionHash: removePrefix(params[0]), checkingPending: true } });
      return this.getTransactionCreates(ret);
    } catch (e) {
      return null;
    }
  }

  public async getTransactionByBlockHashAndIndex(params: any) {
    const [ blkHash, id ] = params;
    try {
      const ret = await antenna.iotx.getActions({ byBlk: { blkHash: removePrefix(blkHash), start: id, count: 1 } });
      return this.getTransactionCreates(ret);
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
      return this.getTransactionCreates(ret);
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
      // @ts-ignore
      blockHash: '0x' + v.blkHash.toString('hex'),
      transactionHash: '0x' + v.actHash.toString('hex'),
      logIndex: numberToHex(v.index),
      blockNumber: numberToHex(v.blkHeight),
      transactionIndex: '0x1',
      address: toEth(v.contractAddress),
      data: '0x' + v.data.toString('hex'),
      topics: v.topics.map(v => '0x' + v.toString('hex'))
    }));
  }

  public async newFilter(params: any) {
    const { fromBlock = 'latest', toBlock = 'latest', topics = [], address = [] } = params[0];
    const key = '0x' + createHash({
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
    const key = '0x' + createHash({
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

}

export const apiService = new ApiService();
