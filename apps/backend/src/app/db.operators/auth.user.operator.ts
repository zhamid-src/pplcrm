import { TableType } from "../kysely.models";
import { db } from "../kyselyiit";
import { BaseOperator } from "./base.operator";

export class AuthUsersOperator extends BaseOperator<TableType.AuthUsers> {
  // #region Constructors (1)

  constructor() {
    super(TableType.AuthUsers);
  }

  // #endregion Constructors (1)

  // #region Public Methods (1)

  public addtenant(id: never, tenant_id: never) {
    const json = {
      tenant_id,
    } as never;

    return db
      .updateTable(this.table)
      .set({
        raw_user_meta_data: json,
      })
      .where("id", "=", id)
      .executeTakeFirst();
  }

  // #endregion Public Methods (1)
}
