import dotenv from 'dotenv';
import { np } from './precision.util';

function process_init() {
  const ma = require('module-alias/register');
  dotenv.config({ path: '.env' });
  np.init();
}

export { process_init };
