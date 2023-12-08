import { TableType } from "../kysely.models";
import { BaseOperator } from "./base.operator";

export class HouseholdOperator extends BaseOperator<TableType.households> {
  // #region Constructors (1)

  constructor() {
    super(TableType.households);
  }

  // #endregion Constructors (1)
}
