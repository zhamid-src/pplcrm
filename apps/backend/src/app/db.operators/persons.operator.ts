import { TableType } from "../kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class PersonsOperator extends BaseOperator<TableType.persons> {
  // #region Constructors (1)

  constructor() {
    super(TableType.persons);
  }

  // #endregion Constructors (1)

  // #region Public Methods (1)

  public getPersonsInHousehold(
    id: string,
    options?: QueryParams<TableType.persons>,
  ) {
    return this.getQuery(options).where("household_id", "=", id).execute();
  }

  // #endregion Public Methods (1)
}
