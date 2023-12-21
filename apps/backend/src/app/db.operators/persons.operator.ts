import { TableType } from "../../../../../common/src/lib/kysely.models";
import { db } from "../kyselyinit";
import { BaseOperator, QueryParams } from "./base.operator";

export class PersonsOperator extends BaseOperator<
  TableType.persons | TableType.households
> {
  constructor() {
    super(TableType.persons);
  }

  public async getAllWithHouseholds(
    optionsIn?: QueryParams<TableType.persons | TableType.households>,
  ): Promise<Partial<TableType.persons | TableType.households>[]> {
    const options =
      optionsIn ||
      ({} as QueryParams<TableType.persons | TableType.households>);

    options!.columns = options?.columns || [
      "persons.id",
      "persons.first_name",
      "persons.last_name",
      "persons.email",
      "persons.mobile",
      "persons.notes",
      "households.street1",
      "households.city",
    ];
    let query = db
      .selectFrom(this.table)
      .innerJoin("households", "persons.household_id", "households.id");

    query = this.getQueryWithOptions(query, options);

    return (await query.execute()) as Partial<
      TableType.households | TableType.persons
    >[];
  }

  public getPersonsInHousehold(
    household_id: bigint,
    options?: QueryParams<TableType.persons | TableType.households>,
  ) {
    return this.getQuery(options)
      .where("household_id", "=", household_id)
      .execute();
  }
}
