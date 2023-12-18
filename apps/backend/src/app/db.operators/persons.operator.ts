import { TableType } from "../kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class PersonsOperator extends BaseOperator<TableType.persons> {
  constructor() {
    super(TableType.persons);
  }

  public getPersonsInHousehold(
    household_id: bigint,
    options?: QueryParams<TableType.persons>,
  ) {
    return this.getQuery(options)
      .where("household_id", "=", household_id)
      .execute();
  }
}
