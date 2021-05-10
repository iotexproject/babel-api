import _ from 'lodash';
import redis from 'redis';
import { promisify } from 'util';
import { logger } from '@common/utils';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from '@config/env';

const redisClient = redis.createClient({
   host: REDIS_HOST,
   port: REDIS_PORT,
   password: REDIS_PASSWORD
});

class RedisHelper {

  public async exists(key: string) {
    return new Promise((resolve, rejects) => {
      redisClient.exists(key, (err, reply) => {
        if (err)
          rejects(err);
        else
          resolve(reply);
      });
    });
  }

  public set(key: string, value: string) {
    return promisify(redisClient.set).bind(redisClient)(key, value);
  }

  public setex(key: string, value: string, seconds: number) {
    return promisify(redisClient.setex).bind(redisClient)(key, seconds, value);
  }

  public get(key: string) {
    return promisify(redisClient.get).bind(redisClient)(key);
  }

  public del(key: string) {
    return new Promise((resolve, rejects) => {
      redisClient.del(key, (err, reply) => {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public incr(key: string) {
    return promisify(redisClient.incr).bind(redisClient)(key);
  }

  public incrby(key: string, increment: number) {
    return promisify(redisClient.incrby).bind(redisClient)(key, increment);
  }

  public hset(key: string, field: string, value: string) {
    return new Promise((resolve, reject) => {
      redisClient.hset(key, field, value, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public hget(key: string, field: string) {
    return promisify(redisClient.hget).bind(redisClient)(key, field);
  }

  public hgetall(key: string) {
    return promisify(redisClient.hgetall).bind(redisClient)(key);
  }

  public hincrby(key: string, field: string, increment: number) {
    return promisify(redisClient.hincrby).bind(redisClient)(key, field, increment);
  }

  public zadd(key: string, ...args: Array<string | number>) {
    return new Promise((resolve, rejects) => {
      redisClient.zadd(key, ...args, function(err, reply) {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public pexpire(key: string, milliseconds: number) {
    return promisify(redisClient.pexpire).bind(redisClient)(key, milliseconds);
  }

  public expire(key: string, seconds: number) {
    return promisify(redisClient.expire).bind(redisClient)(key, seconds);
  }

  public async zrangebyscore(key: string, min: number | string, max: number | string) {
    return await promisify(redisClient.zrangebyscore).bind(redisClient)(key, min, max) as string[];
  }

  public zremrangebyscore(key: string, min: number, max: number) {
    return promisify(redisClient.zremrangebyscore).bind(redisClient)(key, min, max);
  }

  public zrevrange(key: string, start: number, stop: number) {
    return new Promise<string[]>((resolve, rejects) => {
      redisClient.zrevrange(key, start, stop, (err, reply) => {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public zrem(key: string, members: string[]) {
    return new Promise((resolve, rejects) => {
      redisClient.zrem(key, members, (err, reply) => {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public hmget(key: string, args: string[]) {
    return new Promise<string[]>((resolve, rejects) => {
      redisClient.hmget(key, args, (err, reply) => {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public hmset(key: string, args: { [key: string]: string | number }) {
    return new Promise((resolve, rejects) => {
      redisClient.hmset(key, args, (err, reply) => {
        if (err)
          rejects(err);
        else
          resolve(reply);
      });
    });
  }

  public hmdel(key: string, args: string[]) {
    return new Promise((resolve, rejects) => {
      redisClient.hdel(key, args, function(err, reply) {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public exist(key: string) {
    return new Promise((resolve, rejects) => {
      redisClient.exists(key, function(err, reply) {
        if (err) {
          rejects(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  public zscore(key: string, member: string) {
    return promisify(redisClient.zscore).bind(redisClient)(key, member);
  }

  public async remembers(key: string, getCB: Function, expire?: number) {
    const ex = _.defaultTo(expire, 0);
    let ret = await this.get(key);
    if (_.isEmpty(ret)) {
      const data = await getCB();
      if (!_.isNil(data)) {
        const t = typeof(data);
        ret = (t == 'object') ? JSON.stringify(data) : '' + data;
        if (ex > 0)
          await this.setex(key, ret, ex);
        else
          await this.set(key, ret);
      }
    }

    return ret;
  }

  public async remember(key: string, getCB: Function, expire?: number) {
    const ret = await this.remembers(key, getCB, expire);
    if (_.isNil(ret) || _.isEmpty(ret))
      return null;

    try {
      return JSON.parse(ret);
    } catch (e) {
      logger.error(`JSON parse failed, key=${key}`);
      return null;
    }
  }

  public scard(key: string) {
    return promisify(redisClient.scard).bind(redisClient)(key);
  }

  public sismember(key: string, member: string) {
    return promisify(redisClient.sismember).bind(redisClient)(key, member);
  }

  public smembers(key: string) {
    return promisify(redisClient.smembers).bind(redisClient)(key);
  }

  public sadd(key: string, members: string[]) {
    return new Promise((resolve, rejects) => {
      redisClient.sadd(key, members, (err, reply) => {
        if (err)
          rejects(err);
        else
          resolve(reply);
      });
    });
  }

  public srem(key: string, members: string[]) {
    return new Promise((resolve, rejects) => {
      redisClient.srem(key, members, (err, reply) => {
        if (err)
          rejects(err);
        else
          resolve(reply);
      });
    });
  }

  public spop(key: string) {
    return new Promise((resolve, rejects) => {
      redisClient.spop(key, (err, reply) => {
        if (err)
          rejects(err);
        else
          resolve(reply);
      });
    });
  }

  public srandmember(key: string, count: number) {
  return new Promise<string[]>((resolve, rejects) => {
      redisClient.srandmember(key, count, (err, reply) => {
        if (err)
          rejects(err);
        else
          resolve(reply);
      });
    });
  }

  public zincrby(key: string, increment: number, member: string) {
    return promisify(redisClient.zincrby).bind(redisClient)(key, increment, member);
  }

}

export const redisHelper = new RedisHelper();
