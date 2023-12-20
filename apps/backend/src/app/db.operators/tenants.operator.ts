import { TableType } from "../../../../../common/src/lib/kysely.models";
import { BaseOperator } from "./base.operator";

export class TenantsOperator extends BaseOperator<TableType.tenants> {
  // #region Constructors (1)

  constructor() {
    super(TableType.tenants);
  }

  // #endregion Constructors (1)
}
