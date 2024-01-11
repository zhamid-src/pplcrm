import { getAllOptionsType } from '@common';
import {
  GetOperandType,
  Models,
  OperationDataType,
  TableIdType,
} from '../../../../../common/src/lib/kysely.models';
import { BaseRepository, QueryParams } from '../repositories/base.repository';

export class BaseController<T extends keyof Models, O extends BaseRepository<T>> {
  constructor(protected operator: O) {}

  public addMany(rows: OperationDataType<T, 'insert'>[]) {
    return this.operator.addMany(rows);
  }

  public addOne(row: OperationDataType<T, 'insert'>) {
    return this.operator.addOne(row);
  }

  public async delete(id: bigint) {
    // remove any
    return this.operator.deleteOne(id as GetOperandType<T, 'select', any>);
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

  public async update(id: bigint, input: OperationDataType<T, 'update'>) {
    // remove any
    return this.operator.updateOne(id as GetOperandType<T, 'update', any>, input);
  }

  protected getOperator() {
    return this.operator;
  }
}
