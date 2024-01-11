import {
  Models,
  OperationDataType,
  TableIdType,
} from '../../../../../common/src/lib/kysely.models';
import { BaseOperator } from '../db.operators/base.operator';

/**
 * Base controller class for fastify controllers
 */
export class BaseController<T extends keyof Models> {
  protected readonly operator: BaseOperator<T>;

  constructor(dbOperator: BaseOperator<T>) {
    this.operator = dbOperator;
  }

  public async add(row: OperationDataType<T, 'insert'>) {
    return this.operator.addOne(row);
  }

  public delete(id: TableIdType<T>) {
    return this.operator.deleteOne(id);
  }

  public findOne(id: TableIdType<T>) {
    return this.operator.findOne(id);
  }

  public getAll() {
    return this.operator.findAll();
  }

  public async getCount() {
    return this.operator.getCount();
  }

  public update(id: TableIdType<T>, row: OperationDataType<T, 'update'>) {
    return this.operator.updateOne(id, row);
  }
}
