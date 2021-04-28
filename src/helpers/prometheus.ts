import _ from 'lodash';
import { Registry, Pushgateway, Counter } from 'prom-client';
import { PROJECT, PROMETHEUS_HOST } from '@config/env';

class Prometheus {

  public register: Registry;

  constructor() {
    this.register = new Registry();
  }

  public metrics() {
    return this.register.metrics();
  }

}

export class PrometheusCounter {

  private counter: Counter<string>;
  private gateway: Pushgateway;

  constructor(public name: string) {
    const register = new Registry();
    this.counter = new Counter({
      name,
      help: name,
      registers: [ register ]
    });

    register.registerMetric(this.counter);
    this.gateway = new Pushgateway(PROMETHEUS_HOST, {
      timeout: 5000
    }, register);
  }

  public inc(groupings: any = {}) {
    this.counter.inc();
    if (PROMETHEUS_HOST != '')
      this.gateway.pushAdd({ jobName: `${PROJECT}:counter:${this.name}`, groupings }, (err, res, body) => {});
  }

}

export const prometheus = new Prometheus();
