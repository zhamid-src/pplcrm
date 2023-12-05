import { TableType } from "../kysely.models";
import { BaseOperator } from "./base.operator";

export class UsersOperator extends BaseOperator<TableType.users> {
  constructor() {
    super(TableType.users);
  }

  getOneByEmail(email: string, columns?: any) {
    return this.getQuery(columns).where("email", "=", email).executeTakeFirst();
  }
}
