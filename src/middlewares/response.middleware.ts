import { Context } from 'koa';
import { get } from 'lodash';
import { Code } from '@common/enums';
import { logger } from '@common/utils';

interface Params {
  action: (ctx: Context) => any;
  server: string;
}

export function response({ action, server }: Params) {
  return async (ctx: any) => {
    try {
      const data = await action(ctx);
      ctx.body = data || {};
    } catch (e) {
      const params = JSON.stringify(ctx.params);
      const uid = get(ctx, `session.${server}.id`) || '-';
      if (e.code) {
        logger.error(`${ctx.path} ${uid} ${params} ${JSON.stringify(e)}`);
      } else {
        logger.error(`${ctx.path} ${uid} ${params} \n${e.stack}`);
      }

      ctx.body = {
        success: false,
        error: {
          code: e.code || Code.SERVER_ERROR,
          message: e.code ? e.message : 'server error.',
        },
      };
    }
  };
}
