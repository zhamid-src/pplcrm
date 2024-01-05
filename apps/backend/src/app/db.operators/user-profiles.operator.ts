import { TableType } from "../../../../../common/src/lib/kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class UserPofilesOperator extends BaseOperator<TableType.profiles> {
  constructor() {
    super(TableType.profiles);
  }

  /**
   * Get the profile by auth_id
   * @param auth_id
   * @param options
   * @returns
   */
  public getOneByAuthId(
    auth_id: bigint,
    options?: QueryParams<TableType.profiles>,
  ) {
    return this.getQuery(options)
      .where("auth_id", "=", auth_id)
      .executeTakeFirst();
  }
}
