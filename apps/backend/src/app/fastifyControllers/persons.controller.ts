import { TableType } from '../kyselySchema/db.schema';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController {
  constructor() {
    super(TableType.persons);
  }
}
