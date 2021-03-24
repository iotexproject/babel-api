import _ from 'lodash';
import moment from 'moment';
import { Context } from 'koa';
import BaseController from '../base.controller';
import { apiService } from '@service/index';

class ApiController extends BaseController {

  public async entry(ctx: Context) {
    const { id, method, params, jsonrpc } = ctx.request.body;

    console.log(`> ${method} ${JSON.stringify(params)}`);

    const ret = { id, jsonrpc };
    let result;

    if (method == 'eth_chainId') {
      result = '0x1';
    } else if (method == 'eth_blockNumber') {
      result = await apiService.getBlockNumber();
    } else if (method == 'eth_getBlockByNumber') {
      result = await apiService.getBlockByNumber(params[0]);
    } else if (method == 'eth_getBalance') {
      result = await apiService.getBalance(params[0]);
    } else if (method == 'eth_gasPrice') {
      result = await apiService.gasPrice();
    } else if (method == 'eth_getTransactionCount') {
      result = await apiService.getTransactionCount(params[0], params[1]);
    } else if (method == 'eth_sendRawTransaction') {
      result = await apiService.sendRawTransaction(params[0]);
    }

    _.assign(ret, { result });

    console.log(`< ${result}`);

    return ret;
  }

}

export const apiController = new ApiController();

