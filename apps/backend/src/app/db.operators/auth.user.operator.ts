import { db } from '../kysely';
import { TableType } from '../kysely.models';
import { BaseOperator } from './base.operator';

export class AuthUsersOperator extends BaseOperator<TableType.AuthUsers> {
  constructor() {
    super(TableType.AuthUsers);
  }

  addtenant(id: any, tenant_id: any) {
    const json = {
      tenant_id,
    } as any;

    return db
      .updateTable(this.table)
      .set({
        raw_user_meta_data: json,
      })
      .where('id', '=', id)
      .executeTakeFirst();
  }
}
