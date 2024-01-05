import { TableType } from "../../../../../common/src/lib/kysely.models";
import { BaseOperator } from "./base.operator";

export class TenantsOperator extends BaseOperator<TableType.tenants> {
  constructor() {
    super(TableType.tenants);
  }
}
