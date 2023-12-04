import { TableType } from '../tables/db.table';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController {
  constructor() {
    super(TableType.persons);
  }
}
