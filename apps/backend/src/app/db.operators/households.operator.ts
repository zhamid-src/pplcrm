import { sql } from "kysely";
import { TableType } from "../../../../../common/src/lib/kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class HouseholdOperator extends BaseOperator<TableType.households> {
  constructor() {
    super(TableType.households);
  }

  async getAllWithPeopleCount(
    options: QueryParams<TableType.households> = {},
  ): Promise<Partial<TableType.households>[]> {
    options.columns;
    let query = this.selectFrom();
    query = query
      .select(sql<string>`households.*`.as("households"))
      .select(sql<string>`count(persons)`.as("person_count"))
      .innerJoin("persons", "households.id", "persons.household_id")
      .groupBy(["households.id", "households.tenant_id"]);

    return (await query.execute()) as Partial<TableType.households>[];
  }
}
