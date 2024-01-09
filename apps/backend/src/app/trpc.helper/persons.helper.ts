import { UpdatePersonsType, getAllOptionsType } from '@common';
import { InsertObjectOrList } from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { Models } from '../../../../../common/src/lib/kysely.models';
import { QueryParams } from '../db.operators/base.operator';
import { PersonsHouseholdsOperator } from '../db.operators/persons-households.operator';
import { PersonsOperator } from '../db.operators/persons.operator';

export class PersonsHelper {
  private persons = new PersonsOperator();
  private personsHouseholds = new PersonsHouseholdsOperator();

  public add(row: UpdatePersonsType) {
    return this.persons.addOne(row as InsertObjectOrList<Models, 'persons'>);
  }

  public async delete(id: number) {
    return this.persons.deleteOne(BigInt(id));
  }

  public async findAll(options: getAllOptionsType) {
    return this.persons.findAll(options as QueryParams<'persons'>);
  }

  public async findOne(id: number) {
    return this.personsHouseholds.findOne(BigInt(id));
  }

  public getAllWithHouseholds(options: getAllOptionsType) {
    return this.personsHouseholds.findAll(options as QueryParams<'persons' | 'households'>);
  }

  public async update(id: number, input: UpdatePersonsType) {
    return this.persons.updateOne(BigInt(id), input);
  }
}
