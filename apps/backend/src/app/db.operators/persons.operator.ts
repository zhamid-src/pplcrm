import { TableType } from "../kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class PersonsOperator extends BaseOperator<TableType.persons> {
  constructor() {
    super(TableType.persons);
  }

  getPersonsInHousehold(id: any, options?: QueryParams<TableType.persons>) {
    return this.getQuery(options).where("household_id", "=", id).execute();
  }
}
