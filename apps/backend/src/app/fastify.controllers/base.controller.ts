import { FastifyReply } from 'fastify';
import {
  GetOperandType,
  Models,
  OperationDataType,
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
    const result = await this.operator.addOne(row);
    return reply.code(201).send(result);
  }

  public async delete(id: GetOperandType<T, 'select', 'id'>, reply: FastifyReply) {
    const result = await this.operator.deleteOne(id);
    return reply.code(204).send(result);
  }

  public async findOne(id: GetOperandType<T, 'select', 'id'>, reply: FastifyReply) {
    const row = await this.operator.findOne(id);
    return row ? reply.code(200).send(row) : reply.send(404);
  }

  public async getAll(reply: FastifyReply) {
    const result = await this.operator.findAll();
    return result ? reply.code(200).send(result) : reply.send(404);
  }

  public async getCount(reply: FastifyReply) {
    const { count } = (await this.operator.getCount()) || { count: '0' };
    return reply.code(200).send(count);
  }

  public async update(
    id: GetOperandType<T, 'update', 'id'>,
    row: OperationDataType<T, 'update'>,
    reply: FastifyReply,
  ) {
    const result = await this.operator.updateOne(id, row);
    return reply.code(200).send(result);
  }
}
