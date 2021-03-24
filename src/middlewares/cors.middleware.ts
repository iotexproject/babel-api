import koaCors from 'koa2-cors';

interface Opts {}

export function cors(opts?: Opts) {
  return koaCors({
    credentials: true,
  });
}