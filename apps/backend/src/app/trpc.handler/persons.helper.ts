import { getAllOptionsType } from "@common";
import { QueryParams } from "../db.operators/base.operator";
import { PersonsOperator } from "../db.operators/persons.operator";
import { TableType } from "../kysely.models";

const persons = new PersonsOperator();

export class PersonsHelper {
  public async getAll(options: getAllOptionsType) {
    const queryOptions: QueryParams<TableType.persons | TableType.households> =
      {
        ...(options as unknown as QueryParams<TableType.persons>),
      };
    return persons.getAll(queryOptions);
  }

  public getAllWithHouseholds(options: getAllOptionsType) {
    const queryOptions: QueryParams<TableType.persons | TableType.households> =
      {
        ...(options as unknown as QueryParams<
          TableType.persons | TableType.households
        >),
      };
    return persons.getAllWithHouseholds(queryOptions);
  }

  public async getOneById(id: number) {
    return persons.getOneById(BigInt(id));
  }
}
