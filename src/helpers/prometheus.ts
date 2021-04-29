import _ from 'lodash';
import { register, Counter, collectDefaultMetrics } from 'prom-client';
import { PROJECT } from '@config/env';

const worker = process.env.NODE_APP_INSTANCE || '0';

collectDefaultMetrics({ prefix: `${PROJECT}_` });

register.setDefaultLabels({ worker });

class Prometheus {

  private apiCounter: Counter<string>;

  constructor() {
    this.apiCounter = new Counter({
      name: `${PROJECT}_api_calls`,
      help: 'api counter',
      labelNames: [ 'method' ]
    });
  }

  public metrics() {
    return register.metrics();
  }

  public methodInc(method: string) {
    this.apiCounter.labels(method).inc();
    this.apiCounter.labels('total').inc();
  }

}

export const prometheus = new Prometheus();
