import { TableType } from "common/src/lib/kysely.models";
import { HouseholdOperator } from "../db.operators/households.operator";
import { BaseController } from "./base.controller";

export class HouseholdsController extends BaseController<TableType.households> {
  // #region Constructors (1)

  constructor() {
    super(new HouseholdOperator());
  }

  // #endregion Constructors (1)
}
