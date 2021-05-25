import _ from 'lodash';
import { Context } from 'koa';
import BaseController from '../base.controller';
import { apiService } from '@service/index';
import { logger } from '@common/utils';
import { prometheus } from '@helpers/prometheus';

const API_MAP: { [key: string]: string } = {
  ['eth_chainId']: 'getChainId',
  ['eth_blockNumber']: 'getBlockNumber',
  ['eth_getBlockByNumber']: 'getBlockByNumber',
  ['eth_getBalance']: 'getBalance',
  ['eth_gasPrice']: 'gasPrice',
  ['eth_getTransactionCount']: 'getTransactionCount',
  ['eth_sendRawTransaction']: 'sendRawTransaction',
  ['eth_call']: 'call',
  ['eth_estimateGas']: 'estimateGas',
  ['eth_getCode']: 'getCode',
  ['getpeers']: 'getPeers',
  ['eth_getTransactionReceipt']: 'getTransactionReceipt',
  ['web3_clientVersion']: 'getNodeInfo',
  ['net_version']: 'getNetworkId',
  ['net_peerCount']: 'getPeerCount',
  ['net_listening']: 'isListening',
  ['eth_protocolVersion']: 'getProtocolVersion',
  ['eth_syncing']: 'isSyncing',
  ['eth_coinbase']: 'getCoinbase',
  ['eth_mining']: 'isMining',
  ['eth_hashrate']: 'getHashrate',
  ['eth_accounts']: 'getAccounts',
  ['eth_getStorageAt']: 'notImplememted',
  ['eth_getBlockTransactionCountByHash']: 'getBlockTransactionCountByHash',
  ['eth_getBlockTransactionCountByNumber']: 'getBlockTransactionCountByNumber',
  ['eth_getUncleCountByBlockHash']: 'notImplememted',
  ['eth_getUncleCountByBlockNumber']: 'notImplememted',
  ['eth_sign']: 'notImplememted',
  ['eth_signTransaction']: 'notImplememted',
  ['eth_sendTransaction']: 'notImplememted',
  ['eth_getBlockByHash']: 'getBlockByHash',
  ['eth_getTransactionByHash']: 'getTransactionByHash',
  ['eth_getTransactionByBlockHashAndIndex']: 'getTransactionByBlockHashAndIndex',
  ['eth_getTransactionByBlockNumberAndIndex']: 'getTransactionByBlockNumberAndIndex',
  ['eth_getUncleByBlockHashAndIndex']: 'notImplememted',
  ['eth_getUncleByBlockNumberAndIndex']: 'notImplememted',
  ['eth_newFilter']: 'newFilter',
  ['eth_newBlockFilter']: 'newBlockFilter',
  ['eth_uninstallFilter']: 'uninstallFilter',
  ['eth_getFilterChanges']: 'getFilterChanges',
  ['eth_getFilterLogs']: 'getFilterLogs',
  ['eth_getLogs']: 'getLogs',
  ['eth_newPendingTransactionFilter']: 'notImplememted',
  ['eth_pendingTransactions']: 'getPendingTransactions'
};

function getBody(ctx: Context) {
  const { body } = ctx.request;
  return _.isArray(body) ? body[0] : body;
}

class ApiController extends BaseController {

  public async entry(ctx: Context) {
    const { body } = ctx.request;
    if (_.isArray(body)) {
      const rets = [];
      for (let i = 0; i < body.length; i++) {
        const ret = await ApiController.singleEntry(body[i]);
        rets.push(ret);
      }

      return rets;
    } else {
      return ApiController.singleEntry(body);
    }
  }

  private static async singleEntry(data: any) {
    const { id, method, params, jsonrpc } = data;

    logger.info(`> ${method} ${JSON.stringify(params)} ${id} ${jsonrpc}`);

    if (_.isNil(id) || _.isNil(jsonrpc) || _.isNil(method)) {
      prometheus.methodInc('invalid');
      return;
    }

    const ret = { id, jsonrpc };
    let result;

    const service: any = apiService;
    const name = API_MAP[method];
    if (name != null && service[name] != null) {
      try {
        result = await service[name](params);
      } catch (e) {
        result = { error: e.toString() };
        logger.error(`process ${name} rpc error: e.toString()`);
      }

      logger.info(`< ${method}  ${typeof(result) == 'object' ? JSON.stringify(result) : result }`);
    } else {
      logger.warn(`unsupported method: ${method} ${JSON.stringify(params)}`);
    }

    _.assign(ret, { result });

    prometheus.methodInc(method);

    return ret;
  }

  public ping(ctx: Context) {
    return 'pong';
  }

  public metrics(ctx: Context) {
    return prometheus.metrics();
  }

}

export const apiController = new ApiController();

