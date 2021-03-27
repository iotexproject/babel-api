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

  public async getBlockByNumber(params: any[]) {
    const [ block_id ] = params;
    const ret = await antenna.iotx.getBlockMetas({ byIndex: { start: block_id, count: 1 } });
    const { blkMetas, total } = ret;
    if (total == 0)
      return {};

    const b = blkMetas[0];
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
    const { to, data } = tx;
    const address = this.fromEth(to);

    

    // TODO
    return '0x0';
  }

  public async getCode(params: any[]) {
    const [ address, block_id ] = params;

  }

  public async getNetworkId(params: any) {
    return "1";
  }

  public async getPeers(params: any) {

  }

  public async getTransactionReceipt(params: any) {
    let [ hash ] = params;
    if (_.startsWith(hash, '0x')) hash = hash.slice(2);

    console.log(`hash=${hash}`);

    const ret = await antenna.iotx.getReceiptByAction({ actionHash: hash });
    const { receiptInfo } = ret;
    const { receipt, blkHash } = receiptInfo || {};
    const { status, blkHeight, actHash, gasConsumed, contractAddress, logs } = receipt || {};

    console.log(JSON.stringify(ret));

    return {
      blockNumber: this.numberToHex(blkHeight || 0),
      blockHash: blkHash,
      transactionHash: actHash?.toString('hex'),
      cumulativeGasUsed: this.numberToHex(gasConsumed || 0),
      gasUsed: this.numberToHex(gasConsumed || 0),
      logs: [],
      contractAddress: this.toEth(contractAddress || ''),
      status: (status == 1 ? 1 : 0)
    };
  }
}

export const apiService = new ApiService();
