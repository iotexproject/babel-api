import { Route } from '@common/interfaces';
import { RequestMethod } from '@common/enums';
import { api } from '@controller/api';

const prefix = '';

const routes: Route[] = [
  {
    name: 'root',
    path: '/',
    method: RequestMethod.POST,
    action: api.apiController.entry
  }
];

export default routes.map((item) => ({ ...item, path: `${prefix}${item.path}` }));
