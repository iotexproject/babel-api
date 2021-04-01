var BN = require('bn.js');
var numberToBN = require('number-to-bn');
import _ from 'lodash';
import moment from 'moment';
import Antenna from 'iotex-antenna';
import { fromString, fromBytes } from 'iotex-antenna/lib/crypto/address';
import BaseService from './base.service';
import { Assert, Exception } from '@common/exceptions';
import { Code } from '@common/enums';

//const antenna = new Antenna("https://api.iotex.one:443");
const antenna = new Antenna("https://api.nightly-cluster-2.iotex.one:443");

const CHAIN_ID = 4689;

class ApiService extends BaseService {

  private toEth(address: string) {
    const a = fromString(address);
    return a.stringEth();
  }

  private fromEth(address: string) {
    if (address.startsWith('0x'))
      address = address.substring(2);

    const bytes = Buffer.from(address, 'hex');
    const a = fromBytes(bytes);
    return a.string();
  }

  private toBN(v: number | string) {
    return numberToBN(v);
  }

  private numberToHex(v: number | string) {
    const n = this.toBN(v);
    const result = n.toString(16);
    return n.lt(new BN(0)) ? '-0x' + result.substr(1) : '0x' + result;
  } 

  public async getChainId(params: any[]) {
    return this.numberToHex(CHAIN_ID);
  }

  public async getBlockNumber(params: any[]) {
    const ret = await antenna.iotx.getChainMeta({});
    const n =  _.get(ret, 'chainMeta.height', 0);
    return this.numberToHex(n);
  }

  public async getAccounts(params: any[]) {
    return [];
  }

  public async getBalance(params: any[]) {
    const [ address ] = params;
    const ret = await antenna.iotx.getAccount({ address: this.fromEth(address) });
    
    const b = _.get(ret, 'accountMeta.balance', 0);
    return this.numberToHex(b);
  }

  public async gasPrice(params: any) {
    const { gasPrice } = await antenna.iotx.suggestGasPrice({});
    return gasPrice;
  }

  public async getTransactionCount(params: any[]) {
    const [ address, block_id ] = params;
    const ret = await antenna.iotx.getAccount({ address: this.fromEth(address) });    
    const b = _.get(ret, 'accountMeta.pendingNonce', 0);
    return this.numberToHex(b);
  }

  public async sendRawTransaction(params: any[]) {
    const [ data ] = params;
    const ret = await antenna.iotx.sendRawTransaction({ chainID: CHAIN_ID, data });
    return ret;
  }

  public async call(params: any[]) {
    const [ tx ] = params;
    const { to, data } = tx;
    const address = this.fromEth(to);

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

    return ret;
  }

  public async estimateGas(params: any[]) {
    const [ tx ] = params;
    const { to, data, from, value } = tx;

    const toValid = _.size(to) > 0;

    const dst = toValid ? this.fromEth(to) : '';
    let isContract = true;
    if (toValid) {
      const account = await antenna.iotx.getAccount({
        address: dst
      });
      if (!account.accountMeta) {
        throw new Error(`can't fetch ${to} account info`);
      }
      isContract = account.accountMeta.isContract;
    }

    const amount = numberToBN(value || 0).toString();
    let src = 'io1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7';
    if (_.size(from) > 0)
      src = this.fromEth(from);

    const args: any = { callerAddress: src };
    if (isContract) {
      args.execution = {
        amount,
        contract: dst,
        data: data.slice(2)
      };
    } else {
      args.transfer = {
        amount,
        recipient: dst,
        payload: data.slice(2)
      };
    }

    const { gas } = await antenna.iotx.estimateActionGasConsumption(args);
    return this.numberToHex(gas);
  }

  public async getCode(params: any[]) {
    const [ address, block_id ] = params;
    return '0x0';
  }

  public async getNetworkId(params: any) {
    return "4689";
  }

  public async getPeers(params: any) {
    return [];
  }

  public async getTransactionReceipt(params: any) {
    let [ hash ] = params;
    if (_.startsWith(hash, '0x')) hash = hash.slice(2);

    const ret = await antenna.iotx.getReceiptByAction({ actionHash: hash });
    const { receiptInfo } = ret;
    const { receipt, blkHash } = receiptInfo || {};
    const { status, blkHeight, actHash, gasConsumed, contractAddress, logs } = receipt || {};

    return {
      blockNumber: this.numberToHex(blkHeight || 0),
      blockHash: blkHash,
      transactionHash: actHash?.toString('hex'),
      cumulativeGasUsed: this.numberToHex(gasConsumed || 0),
      gasUsed: this.numberToHex(gasConsumed || 0),
      logs: [],
      contractAddress: (contractAddress == '' ? contractAddress : this.toEth(contractAddress || '')),
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

  private async blockByHash(hash: string) {
    const ret = await antenna.iotx.getBlockMetas({ byHash: { blkHash: hash } });
    return _.get(ret, 'blkMetas[0]');
  }
  
  private async blockById(id: number) {
    const ret = await antenna.iotx.getBlockMetas({ byIndex: { start: id, count: 1 } });
    return _.get(ret, 'blkMetas[0]');
  }

  public async getBlockTransactionCountByHash(params: any) {
    const b = await this.blockByHash(params[0]);
    return this.numberToHex(b?.numActions || 0);
  }

  public async getBlockTransactionCountByNumber(params: any) {
    const b = await this.blockById(params[0]);
    return this.numberToHex(b?.numActions || 0);
  }

  public async getBlockByNumber(params: any[]) {
    const [ block_id ] = params;

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

    return {
      number: this.numberToHex(b.height),
      hash: '0x' + b.hash,
      parentHash: '0x' + b.previousBlockHash,
      nonce: '0x1',
      sha3Uncles: '',
      logsBloom: b.logsBloom,
      transactionsRoot: '0x' + b.txRoot,
      stateRoot: '0x' + b.deltaStateDigest,
      miner: this.toEth(b.producerAddress),
      difficulty: '21345678965432',
      totalDifficulty: '324567845321',
      size: this.numberToHex(b.numActions),
      extraData: '0x',
      gasLimit: '0xbebc20',
      gasUsed: '0xbebc20',
      timestamp: this.numberToHex(b.timestamp.seconds),
      transactions: [],
      uncles: []
    };
  }

  public async getBlockByHash(params: any) {
    const [ blkHash ] = params;
    const b = await this.blockByHash(blkHash);
    if (!b)
      return {};

    return {
      number: this.numberToHex(b.height),
      hash: '0x' + b.hash,
      parentHash: '0x' + b.previousBlockHash,
      nonce: '0x1',
      sha3Uncles: '',
      logsBloom: b.logsBloom,
      transactionsRoot: '0x' + b.txRoot,
      stateRoot: '0x' + b.deltaStateDigest,
      miner: this.toEth(b.producerAddress),
      difficulty: '21345678965432',
      totalDifficulty: '324567845321',
      size: this.numberToHex(b.numActions),
      extraData: '0x',
      gasLimit: '0x10000',
      gasUsed: '0x1',
      timestamp: this.numberToHex(b.timestamp.seconds),
      transactions: [],
      uncles: []
    };

  }

  private async transaction(ret: any) {
    const { actionInfo } = ret;
    const { action, actHash, blkHash, blkHeight, sender, gasFee, timestamp } = actionInfo[0];
    const { core, senderPubKey, signature } = action;
    const { nonce, gasLimit, gasPrice, transfer, execution } = core;

    let value = '0x0';
    let to = '';
    let data = '';
    if (transfer != null) {
      const { amount, recipient } = transfer;
      value = this.numberToHex(amount);
      to = this.toEth(recipient);
    } else if (execution != null) {
      const { amount, contract, data: d } = execution;
      value = this.numberToHex(amount);
      to = _.size(contract) > 0 ? this.toEth(contract) : '';
      data = `0x${d.toString('hex')}`;
    }

    return {
      hash: `0x${actHash}`,
      blockHash: `0x${blkHash}`,
      blockNumber: this.numberToHex(blkHeight),
      transactionIndex: '0x0', // TODO
      nonce: this.numberToHex(nonce),
      gas: this.numberToHex(gasLimit),
      gasPrice: this.numberToHex(gasPrice),
      value,
      to,
      from: this.toEth(sender),
      input: data
    };
  }

  public async getTransactionByHash(params: any) {
    const [ hash ] = params;
    const ret = await antenna.iotx.getActions({ byHash: { actionHash: hash, checkingPending: true } });
    return this.transaction(ret);
  }

  public async getTransactionByBlockHashAndIndex(params: any) {
    const [ blkHash, id ] = params;
    const ret = await antenna.iotx.getActions({ byBlk: { blkHash, start: id, count: 1 } });
    return this.transaction(ret);
  }

  public async getTransactionByBlockNumberAndIndex(params: any) {
    const [ blkId, id ] = params;
    const b = await this.blockById(blkId);
    if (!b)
      return {};

    const ret = await antenna.iotx.getActions({ byBlk: { blkHash: b.hash, start: id, count: 1 } });
    return this.transaction(ret);
  }

  public async getPendingTransactions(params: any) {
    return this.notImplememted(params);
  }

  public async compileLLL(params: any) {
    return this.notImplememted(params);
  }

  public async compileSolidity(params: any) {
    return this.notImplememted(params);
  }

  public async compileSerpent(params: any) {
    return this.notImplememted(params);
  }

}

export const apiService = new ApiService();
