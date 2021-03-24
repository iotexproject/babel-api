import _ from 'lodash';

const { env } = process;

const get = (name: string, _default: string = '') => {
  return _.get(env, name, _default);
}

const getNumber = (name: string, _default: number = 0) => {
  const n = get(name);
  const num = (!_.isNil(n) && !_.isEmpty(n)) ? _.toNumber(n) : undefined;
  return _.defaultTo(num, _default);
}

export const NODE_ENV = env.NODE_ENV;

export const PROJECT = get('PROJECT', 'xxx');

export const SYSLOG_HOST = get('SYSLOGD_HOST');
export const SYSLOG_PORT = getNumber('SYSLOGD_PORT', 514);
export const SYSLOG_PROTOCOL = get('SYSLOGD_PROTOCOL', 'U');
export const SYSLOG_TAG = get('SYSLOGD_TAG', `${PROJECT}`);

export const API_PORT = getNumber('API_PORT', 9000);

export const LOG_LEVEL = get('LOG_LEVEL', 'error');
export const DB_LOG = getNumber('DB_LOG', 0) > 0;
