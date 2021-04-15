import { Route } from '@common/interfaces';
import { RequestMethod } from '@common/enums';
import { api } from '@controller/api';

const prefix = '';

const routes: Route[] = [
  {
    name: 'ping',
    path: '/ping',
    method: RequestMethod.GET,
    action: api.apiController.ping
  }
];

export default routes.map((item) => ({ ...item, path: `${prefix}${item.path}` }));
