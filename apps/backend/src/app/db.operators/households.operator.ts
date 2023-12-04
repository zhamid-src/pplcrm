import { TableType } from '../kysely.models';
import { BaseOperator } from './base.operator';

export class HouseholdOperator extends BaseOperator<TableType.households> {
  constructor() {
    super(TableType.households);
  }
}
