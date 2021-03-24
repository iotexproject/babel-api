import _ from 'lodash';
import { Context } from 'koa';
import BaseController from '../base.controller';
import { apiService } from '@service/index';

const API_MAP: { [key: string]: (params: any[]) => Promise<any> } = {
  ['eth_chainId']: apiService.getChainId,
  ['eth_blockNumber']: apiService.getBlockNumber,
  ['eth_getBlockByNumber']: apiService.getBlockByNumber,
  ['eth_getBalance']: apiService.getBalance,
  ['eth_gasPrice']: apiService.gasPrice,
  ['eth_getTransactionCount']: apiService.getTransactionCount,
  ['eth_sendRawTransaction']: apiService.sendRawTransaction
};

class ApiController extends BaseController {

  public async entry(ctx: Context) {
    const { id, method, params, jsonrpc } = ctx.request.body;

    console.log(`> ${method} ${JSON.stringify(params)}`);

    const ret = { id, jsonrpc };
    let result;

    const cb = API_MAP[method];
    if (cb != null) {
      result = await cb(params);
    }

    _.assign(ret, { result });

    console.log(`< ${result}`);

    return ret;
  }

}

export const apiController = new ApiController();

