import koaBody from 'koa-body';

interface Opts extends koaBody.IKoaBodyOptions {}

export function body(opts?: Opts) {
  return koaBody({
    includeUnparsed: true,
    multipart: true,
    formidable: {
      maxFieldsSize: 10 * 1024 * 1024,
    },
  });
}