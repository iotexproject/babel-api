import _ from 'lodash';
import { createLogger, format, transports } from 'winston';
import moment from 'moment';
import { LOG_LEVEL, PROJECT } from '@config/env';

const { combine, printf } = format;
const { Rsyslog } = require('winston-rsyslog');

const { env } = process;

const host = env.SYSLOGD_HOST || '';
const port = Number(env.SYSLOGD_PORT) || 514;
const protocol = env.SYSLOGD_PROTOCOL || 'U';
const tag = env.SYSLOGD_TAG || PROJECT;

const timestamp = () => moment().format('YYYY-MM-DD HH:mm:ss');

const trans = [ new transports.Console() ];
if (!_.isEmpty(host))
  trans.push(new Rsyslog({ host, port, protocol, tag }));

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(
    printf(info => `[${timestamp()}] ${info.level} ${info.message}`),
  ),
  transports: trans
});

export { logger };
