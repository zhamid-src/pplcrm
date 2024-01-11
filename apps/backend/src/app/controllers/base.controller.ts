import { getAllOptionsType } from '@common';
import {
  InsertObject,
  InsertObjectOrList,
} from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { Models, TableIdType, UpdateRow } from '../../../../../common/src/lib/kysely.models';
import { BaseOperator, QueryParams } from '../db.operators/base.operator';

export class BaseController<T extends keyof Models, O extends BaseOperator<T>> {
  constructor(protected operator: O) {}

  public addMany(row: ReadonlyArray<InsertObject<Models, T>>) {
    return this.operator.addMany(row);
  }

  public addOne(row: InsertObjectOrList<Models, T>) {
    return this.operator.addOne(row);
  }

  public async delete(id: bigint) {
    return this.operator.deleteOne(id as TableIdType<T>);
  }

  public async findAll(options?: getAllOptionsType) {
    return this.operator.findAll(options as QueryParams<T>);
  }

  public async findOne(id: bigint) {
    return this.operator.findOne(id as TableIdType<T>);
  }

  public async getCount() {
    return this.operator.getCount();
  }

  public async update(id: bigint, input: UpdateRow<T>) {
    return this.operator.updateOne(id as TableIdType<T>, input);
  }

  protected getOperator() {
    return this.operator;
  }
}
