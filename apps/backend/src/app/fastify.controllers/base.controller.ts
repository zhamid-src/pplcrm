import { FastifyReply } from 'fastify';
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

  public async add(row: OperationDataType<T, 'insert'>, reply: FastifyReply) {
    return this.operator.addOne(row);
  }

  public delete(id: TableIdType<T>, reply: FastifyReply) {
    return this.operator.deleteOne(id);
  }

  public findOne(id: TableIdType<T>, reply: FastifyReply) {
    return this.operator.findOne(id);
  }

  public getAll(reply: FastifyReply) {
    return this.operator.findAll();
  }

  public async getCount(reply: FastifyReply) {
    return this.operator.getCount();
  }

  public update(id: TableIdType<T>, row: OperationDataType<T, 'update'>, reply: FastifyReply) {
    return this.operator.updateOne(id, row);
  }
}
