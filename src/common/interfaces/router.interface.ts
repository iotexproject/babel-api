import Joi from 'joi';
import { Context } from 'koa';
import { IMiddleware } from 'koa-router';

import { RequestMethod } from '../enums';

export interface Route {
  name: string;
  path: string;
  method: RequestMethod;
  params?: Joi.ObjectSchema<any>;
  middlewares?: IMiddleware[];
  action: (ctx: Context) => any;
  authority?: string[];
  isSkip?: boolean;
  isAttachment?: boolean;
}
