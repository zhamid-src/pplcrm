import { TableType } from "../kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class UserPofilesOperator extends BaseOperator<TableType.userprofiles> {
  constructor() {
    super(TableType.userprofiles);
  }

  /*
  public getOneByEmail(email: string, columns?: QueryParams<TableType.users>) {
    return this.getQuery(columns).where("email", "=", email).executeTakeFirst();
  }
  */
  public getOneByAuthId(
    auth_id: number,
    options?: QueryParams<TableType.userprofiles>,
  ) {
    return this.getQuery(options)
      .where("auth_id", "=", auth_id)
      .executeTakeFirst();
  }
}
