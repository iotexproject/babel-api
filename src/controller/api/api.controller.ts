import _ from 'lodash';
import { Context } from 'koa';
import BaseController from '../base.controller';
import { apiService } from '@service/index';

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
  ['net_version']: 'getNetworkId',
  ['getpeers']: 'getPeers'
};

class ApiController extends BaseController {

  public async entry(ctx: Context) {
    const { id, method, params, jsonrpc } = ctx.request.body;

    console.log(`> ${method} ${JSON.stringify(params)}`);

    const ret = { id, jsonrpc };
    let result;

    const service: any = apiService;
    const name = API_MAP[method];
    if (name != null && service[name] != null) {
      result = await service[name](params);
    }

    _.assign(ret, { result });

    console.log(`< ${result}`);

    return ret;
  }

}

export const apiController = new ApiController();

