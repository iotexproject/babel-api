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
  ['eth_newFilter']: 'notImplememted',
  ['eth_newBlockFilter']: 'notImplememted',
  ['eth_newPendingTransactionFilter']: 'notImplememted',
  ['eth_uninstallFilter']: 'notImplememted',
  ['eth_getFilterChanges']: 'notImplememted',
  ['eth_getFilterLogs']: 'notImplememted',
  ['eth_getLogs']: 'getLogs',
  ['eth_getWork']: 'notImplememted',
  ['eth_submitWork']: 'notImplememted',
  ['eth_submitHashrate']: 'notImplememted',
  ['eth_pendingTransactions']: 'getPendingTransactions'
};

class ApiController extends BaseController {

  public async entry(ctx: Context) {
    const { id, method, params, jsonrpc } = ctx.request.body;

    logger.info(`> ${method} ${JSON.stringify(params)}`);

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
        logger.error(e.toString());
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

