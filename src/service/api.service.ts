var BN = require('bn.js');
var numberToBN = require('number-to-bn');
import _ from 'lodash';
import Antenna from 'iotex-antenna';
import { fromString, fromBytes } from 'iotex-antenna/lib/crypto/address';
import { hash160b } from 'iotex-antenna/lib/crypto/hash';
import { IBlockMeta, IGetLogsRequest } from 'iotex-antenna/lib/rpc-method/types';
import BaseService from './base.service';
import { Assert, Exception } from '@common/exceptions';
import { Code } from '@common/enums';
import { END_POINT, CHAIN_ID } from '@config/env';

const antenna = new Antenna(END_POINT);

function removePrefix(content: string) {
  return (content.startsWith('0x') || content.startsWith('0X')) ? content.slice(2) : content;
}

function toEth(address: string) {
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
  return numberToBN(v);
}

function numberToHex(v: number | string) {
  const n = toBN(v);
  const result = n.toString(16);
  return n.lt(new BN(0)) ? ('-0x' + result.substr(1)) : ('0x' + result);
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
    return _.get(ret, 'accountMeta.contractByteCode').toString('hex');
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

    const height = blkHeight || 0;

    return {
      blockNumber: height,
      blockHash: blkHash,
      transactionHash: '0x' + hash,
      cumulativeGasUsed: numberToHex(gasConsumed || 0),
      gasUsed: numberToHex(gasConsumed || 0),
      logs: logs.map(v => ({
        blockHash: '0x' + blkHash,
        transactionHash: '0x' + hash,
        logIndex: v.index,
        blockNumber: v.blkHeight,
        address: toEth(v.contractAddress),
        data: '0x' + v.data.toString('hex'),
        topics: v.topics.map(v => '0x' + v.toString('hex'))
      })),
      contractAddress: (contractAddress == '' ? contractAddress : toEth(contractAddress || '')),
      status: (status == 1 ? 1 : 0)
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
    return b?.numActions || 0;
  }

  public async getBlockTransactionCountByNumber(params: any) {
    const b = await this.blockById(params[0]);
    return b?.numActions || 0;
  }

  private async getBlockWithTransaction(b: IBlockMeta, detail: boolean) {
    const { hash } = b;
    const ret = await antenna.iotx.getActions({
      byBlk: { blkHash: hash, start: 0, count: 1000 }
    });

    const height = b.height;
    const actions = ret.actionInfo || [];
    let transactions;
    if (detail) {
      transactions = actions.map(v => {
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
          
        return {
          hash: '0x' + v.actHash,
          nonce: _.get(action, 'core.nonce', 0),
          blockHash: '0x' + v.blkHash,
          blockNumber: height,
          transactionIndex: 1,
          from: '0x' + hash160b(v.action.senderPubKey),
          to,
          value,
          gas: _.get(action, 'core.gasLimit', 0),
          gasPrice: numberToHex(_.get(action, 'core.gasPrice', 0)),
          input: data
        };
      });
    } else {
      transactions = actions.map(v => '0x' + v.actHash);
    }

    return {
      number: height,
      hash: '0x' + b.hash,
      parentHash: '0x' + (<any>b).previousBlockHash,
      nonce: '0x1',
      sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
      logsBloom: (<any>b).logsBloom,
      transactionsRoot: '0x' + b.txRoot,
      stateRoot: '0x' + b.deltaStateDigest,
      miner: toEth(b.producerAddress),
      difficulty: '21345678965432',
      totalDifficulty: '324567845321',
      size: b.numActions,
      extraData: '0x',
      gasLimit: b.gasLimit,
      gasUsed: b.gasUsed,
      timestamp: numberToHex(b.timestamp.seconds),
      transactions,
      uncles: []
    };
  }

  public async getBlockByNumber(params: any[]) {
    const [ block_id, detail = false ] = params;

    let bid = block_id;
    if (block_id == 'latest' || block_id == '0xNaN') {
      const ret = await antenna.iotx.getChainMeta({});
      bid = _.get(ret, 'chainMeta.height', 0);
    } else {
      bid = numberToBN(block_id).toNumber();
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

  private transaction(ret: any) {
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
      hash: `0x${actHash}`,
      blockHash: `0x${blkHash}`,
      blockNumber: blkHeight,
      transactionIndex: index,
      nonce: nonce,
      gas: gasLimit,
      gasPrice: numberToHex(gasPrice),
      value,
      to,
      from: toEth(sender),
      input: data
    };
  }

  public async getTransactionByHash(params: any) {
    try {
      const ret = await antenna.iotx.getActions({ byHash: { actionHash: removePrefix(params[0]), checkingPending: true } });
      return this.transaction(ret);
    } catch (e) {
      return null;
    }
  }

  public async getTransactionByBlockHashAndIndex(params: any) {
    const [ blkHash, id ] = params;
    try {
      const ret = await antenna.iotx.getActions({ byBlk: { blkHash: removePrefix(blkHash), start: id, count: 1 } });
      return this.transaction(ret);
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
      return this.transaction(ret);
    } catch (e) {
      return null;
    }
  }

  public async getPendingTransactions(params: any) {
    return this.notImplememted(params);
  }

  public async getLogs(params: any) {
    const { fromBlock, toBlock, topics, address } = params[0];
    
    const self = this;
    const args: IGetLogsRequest = { filter: { address: [], topics: [] } };
    const predefined = [ 'latest', 'pending' ];
    let from = 0;
    let to = 0;

    if (predefined.includes(fromBlock) || predefined.includes(toBlock)) {
      const meta = await antenna.iotx.getChainMeta({});
      const height = _.get(meta, 'chainMeta.height', 0);
      if (predefined.includes(fromBlock))
        from = height;
      if (predefined.includes(toBlock))
        to = height;
    }
    
    if (typeof(fromBlock) == 'string' && fromBlock.startsWith('0x'))
      from = numberToBN(fromBlock).toNumber();

    if (typeof(toBlock) == 'string' && toBlock.startsWith('0x'))
      to = numberToBN(toBlock).toNumber();

    if (from > 0 || to > 0)
      args.byRange = { fromBlock: from, toBlock: to, paginationSize: 100, count: 0 };

    if (!_.isNil(address)) {
      const addresses = (_.isArray(address) ? address : [ address ]);
      args.filter.address = addresses.map(v => fromEth(v));
    }

    if (!_.isNil(topics))
      args.filter.topics = (_.isArray(topics) ? topics : [ topics ]);

    const ret = await antenna.iotx.getLogs(args);
    const logs = ret.logs || [];
    return logs.map(v => ({
      blockHash: '0x' + v.blkHash.toString('hex'),
      transactionHash: '0x' + v.actHash.toString('hex'),
      logIndex: v.index,
      blockNumber: v.blkHeight,
      transactionIndex: 1,
      address: toEth(v.contractAddress),
      data: '0x' + v.data.toString('hex'),
      topics: v.topics.map(v => '0x' + v.toString('hex'))
    }));
  }

}

export const apiService = new ApiService();
