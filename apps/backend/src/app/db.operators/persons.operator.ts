import { db } from '../kysely';
import { TableType } from '../kysely.models';
import { BaseOperator } from './base.operator';

export class PersonsOperator extends BaseOperator<TableType.persons> {
  constructor() {
    super(TableType.persons);
  }

  getPersonsInHousehold(id: any) {
    return db
      .selectFrom(this.table)
      .selectAll()
      .where('household_id', '=', id)
      .execute();
  }
}
