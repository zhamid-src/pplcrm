import { UpdatePersonsType, getAllOptionsType } from "@common";
import {
  OperationDataType,
  TableType,
} from "../../../../../common/src/lib/kysely.models";
import { QueryParams } from "../db.operators/base.operator";
import { PersonsOperator } from "../db.operators/persons.operator";

const persons = new PersonsOperator();

export class PersonsHelper {
  public async getAll(options: getAllOptionsType) {
    const queryOptions: QueryParams<TableType.persons | TableType.households> =
      {
        ...(options as QueryParams<TableType.persons>),
      };
    return persons.getAll(queryOptions);
  }

  public getAllWithHouseholds(options: getAllOptionsType) {
    const queryOptions = {
      ...options,
    };
    return persons.getAllWithHouseholds(
      queryOptions as QueryParams<TableType.persons | TableType.households>,
    );
  }

  public async getOneById(id: number) {
    return persons.getOneById(BigInt(id));
  }

  public async update(id: number, input: UpdatePersonsType) {
    return persons.update(
      BigInt(id),
      input as Partial<OperationDataType<TableType.persons, "update">>,
    );
  }

  public async delete(id: number) {
    return persons.delete(BigInt(id));
  }
  public async deleteMany(ids: number[]) {
    return persons.deleteMany(ids.map((id) => BigInt(id)));
  }
}
