import { Next } from 'koa';
import Joi from 'joi';
import { Code } from '@common/enums';
import { logger } from '@common/utils';
import { NODE_ENV } from '@config/env';

interface Opts {
  schema?: Joi.ObjectSchema<any>;
}

export function paramValidate(opts: Opts) {
  return async (ctx: any, next: Next) => {
    const { schema } = opts;
    const contentType: string = ctx.headers['content-type'] || '';

    if (ctx.method === 'POST' && !contentType.startsWith('multipart') && !contentType.startsWith('application/json')) {
      ctx.status = 200;
      ctx.body = 'content-type is not application/json';
      return;
    }

    if (schema) {
      const params = {
        ...ctx.params,
        ...(['POST', 'PUT'].includes(ctx.method) ? ctx.request.body : ctx.request.query),
      };

      const { error, value } = schema.validate(params, {
        allowUnknown: true,
        debug: NODE_ENV === 'development',
      });
      if (error) {
        logger.error(JSON.stringify(params));
        ctx.status = 200;
        ctx.body = {
          success: false,
          error: { code: Code.BAD_PARAMS, message: error.message },
        };
        return;
      }

      ctx.params = value;
    }

    await next();
  };
}
