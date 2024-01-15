import { getAllOptionsType } from '@common';
import { ReferenceExpression } from 'kysely';
import { ExtractTableAlias } from 'kysely/dist/cjs/parser/table-parser';
import {
  GetOperandType,
  Keys,
  Models,
  OperationDataType,
  TableColumnsType,
  TableIdType,
  TablesOperationMap,
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

  public delete(id: bigint) {
    return this.operator.deleteOne(
      id as GetOperandType<T, 'select', Keys<TablesOperationMap[T]['select']>>,
    );
  }

  public findAll(options?: getAllOptionsType) {
    return this.operator.findAll(options as QueryParams<T>);
  }

  public findOne(id: bigint) {
    return this.operator.findOne(id as TableIdType<T>);
  }

  public getCount() {
    return this.operator.getCount();
  }

  public async match(
    key: string,
    column: TableColumnsType<T>,
    lhs: ReferenceExpression<Models, ExtractTableAlias<Models, T>>,
    tenant_id: bigint,
  ) {
    return await this.operator.match(key, column, lhs, tenant_id);
  }

  public update(id: bigint, input: OperationDataType<T, 'update'>) {
    return this.operator.updateOne(
      id as GetOperandType<T, 'update', Keys<TablesOperationMap[T]['update']>>,
      input,
    );
  }

  protected getOperator() {
    return this.operator;
  }
}
