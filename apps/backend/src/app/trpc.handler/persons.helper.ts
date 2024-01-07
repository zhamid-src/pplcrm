import { UpdatePersonsType, getAllOptionsType } from '@common';
import { InsertObjectOrList } from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { Models, TableType } from '../../../../../common/src/lib/kysely.models';
import { QueryParams } from '../db.operators/base.operator';
import { PersonsOperator } from '../db.operators/persons.operator';

const persons = new PersonsOperator();

export class PersonsHelper {
  public add(row: UpdatePersonsType) {
    return persons.addOne(row as InsertObjectOrList<Models, TableType['persons']>);
  }

  public addMany(rows: UpdatePersonsType[]) {
    // TODO: add household_id, createdby_id etc.
    //return persons.addMany(rows as unknown as InsertObjectOrList<Models, TableType["persons"]>);
  }

  public async delete(id: number) {
    return persons.deleteOne(BigInt(id));
  }

  public async findAll(options: getAllOptionsType) {
    const queryOptions: QueryParams<TableType['persons'] | TableType['households']> = {
      ...(options as QueryParams<TableType['persons']>),
    };
    return persons.findAll(queryOptions);
  }

  public async findOne(id: number) {
    return persons.findOne(BigInt(id));
  }

  public getAllWithHouseholds(options: getAllOptionsType) {
    const queryOptions = {
      ...options,
    };
    return persons.getAllWithHouseholds(
      queryOptions as QueryParams<TableType['persons'] | TableType['households']>,
    );
  }

  public async update(id: number, input: UpdatePersonsType) {
    return persons.updateOne(BigInt(id), input);
  }
}
