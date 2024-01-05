import { UpdatePersonsType, getAllOptionsType } from "@common";
import {
  InsertObjectOrList,
  InsertObjectOrListFactory,
} from "node_modules/kysely/dist/cjs/parser/insert-values-parser";
import { Models, TableType } from "../../../../../common/src/lib/kysely.models";
import { QueryParams } from "../db.operators/base.operator";
import { PersonsOperator } from "../db.operators/persons.operator";

const persons = new PersonsOperator();

export class PersonsHelper {
  /**
   * Add a single row
   * @param row
   * @returns the row added
   */
  public add(row: UpdatePersonsType) {
    return persons.add(
      row as never as InsertObjectOrList<Models, TableType.persons>,
    );
  }

  /**
   * Add all given rows
   * @param row
   * @returns the rows added
   */
  public addMany(rows: UpdatePersonsType[]) {
    return persons.addMany(
      rows as never as InsertObjectOrListFactory<Models, TableType.persons>,
    );
  }

  /**
   * Delete the given row
   * @param id
   * @returns
   */
  public async delete(id: number) {
    return persons.delete(BigInt(id));
  }

  /**
   * Delete all the given rows
   * @param ids
   * @returns
   */
  public async deleteMany(ids: number[]) {
    return persons.deleteMany(ids.map((id) => BigInt(id)));
  }

  /**
   * Get all rows with the given options
   * @param options
   * @returns
   */
  public async getAll(options: getAllOptionsType) {
    const queryOptions: QueryParams<TableType.persons | TableType.households> =
      {
        ...(options as QueryParams<TableType.persons>),
      };
    return persons.getAll(queryOptions);
  }

  /**
   * Get all rows with the given options and their household addresses
   * @param options
   * @returns
   */
  public getAllWithHouseholds(options: getAllOptionsType) {
    const queryOptions = {
      ...options,
    };
    return persons.getAllWithHouseholds(
      queryOptions as QueryParams<TableType.persons | TableType.households>,
    );
  }

  /**
   * Get the person that matches the given ID
   * @param id
   * @returns
   */
  public async getOneById(id: number) {
    return persons.getOneById(BigInt(id));
  }

  /**
   * Update the person that matches the given ID
   * @param id
   * @param input
   */
  public async update(id: number, input: UpdatePersonsType) {
    return persons.update(BigInt(id), input);
  }
}
