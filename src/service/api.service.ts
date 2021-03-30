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
    return _.get(ret, 'chainMeta.height', 0);
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
    return b;
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
        externChainID: CHAIN_ID,
        data: d
      },
      callerAddress: address
    });

    console.log(`ret=${ret}`);

    return ret;
  }

  public async estimateGas(params: any[]) {
    const [ tx ] = params;
    const { to, data, from, value } = tx;

    const dst = this.fromEth(to);
    let isContract = true;
    if (to !== "") {
      const account = await antenna.iotx.getAccount({
        address: dst
      });
      if (!account.accountMeta) {
        throw new Error(`can't fetch ${to} account info`);
      }
      isContract = account.accountMeta.isContract;
    }

    const amount = numberToBN(value).toString();

    const args: any = { callerAddress: this.fromEth(from) };
    if (isContract) {
      args.execution = {
        amount,
        contract: dst,
        data: data.slice(2),
        externChainID: CHAIN_ID
      };
    } else {
      args.transfer = {
        amount,
        recipient: dst,
        payload: data.slice(2),
        externChainID: CHAIN_ID
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
    return "1";
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
    const b = await this.blockById(block_id);
    if (!b)
      return {};

    return {
      number: b.height,
      hash: b.hash,
      parentHash: '',
      nonce: 0,
      sha3Uncles: '',
      logsBloom: '',
      transactionsRoot: b.txRoot,
      stateRoot: '',
      miner: this.toEth(b.producerAddress),
      difficulty: '',
      totalDifficulty: '',
      size: b.numActions,
      extraData: '0x',
      gasLimit: 10000,
      gasUsed: 1,
      timestamp: moment(b.timestamp).valueOf(),
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
      number: b.height,
      hash: b.hash,
      parentHash: '',
      nonce: 0,
      sha3Uncles: '',
      logsBloom: '',
      transactionsRoot: b.txRoot,
      stateRoot: '',
      miner: this.toEth(b.producerAddress),
      difficulty: '',
      totalDifficulty: '',
      size: b.numActions,
      extraData: '0x',
      gasLimit: 10000,
      gasUsed: 1,
      timestamp: moment(b.timestamp).valueOf(),
      transactions: [],
      uncles: []
    };
  }

  private async transaction(ret: any) {
    const { actionInfo } = ret;
    const { action, actHash, blkHash, blkHeight, sender, timestamp } = actionInfo;
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
      to = this.toEth(contract);
      data = d.startsWith('0x') ? d : `0x${d}`;
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
