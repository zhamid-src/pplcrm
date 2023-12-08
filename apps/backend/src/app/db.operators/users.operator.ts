import { TableType } from "../kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class UsersOperator extends BaseOperator<TableType.users> {
  // #region Constructors (1)

  constructor() {
    super(TableType.users);
  }

  // #endregion Constructors (1)

  // #region Public Methods (1)

  public getOneByEmail(email: string, columns?: QueryParams<TableType.users>) {
    return this.getQuery(columns).where("email", "=", email).executeTakeFirst();
  }

  // #endregion Public Methods (1)
}
