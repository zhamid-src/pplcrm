import { TableType } from '../kysely.models';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<TableType.persons> {
  constructor() {
    super(TableType.persons);
  }
}
