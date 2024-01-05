import { sql } from "kysely";
import { TableType } from "../../../../../common/src/lib/kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class HouseholdOperator extends BaseOperator<TableType.households> {
  constructor() {
    super(TableType.households);
  }

  /**
   * Get all households with the count of people in them
   * @param options
   * @returns
   */
  public async getAllWithPeopleCount(
    options: QueryParams<TableType.households> = {},
  ): Promise<Partial<TableType.households>[]> {
    options.columns;

    const result = this.selectFrom()
      .select(sql<string>`households.*`.as("households"))
      .select(sql<string>`count(persons)`.as("person_count"))
      .leftJoin("persons", "households.id", "persons.household_id")
      .groupBy(["households.id", "households.tenant_id"])
      .execute();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any as Partial<TableType.households>[];
  }
}
