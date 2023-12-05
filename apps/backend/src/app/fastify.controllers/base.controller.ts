import { FastifyReply } from "fastify";
import { BaseOperator } from "../db.operators/base.operator";
import { GetOperandType, Models, OperationDataType } from "../kysely.models";

export class BaseController<T extends keyof Models> {
  protected readonly operator: BaseOperator<T>;

  constructor(dbOperator: BaseOperator<T>) {
    this.operator = dbOperator;
  }

  /**
   * Get all users. Optional: query parameters.
   *
   * @param reply FastifyReply
   * @returns
   */
  public async getAll(reply: FastifyReply) {
    const result = await this.operator.getAll();
    return result ? reply.code(200).send(result) : reply.send(404);
  }

  /**
   * Get the user by ID
   * @param req FastifyRequest - req.params.id contains the user ID
   * @param reply FastifyReply
   * @returns
   */
  public async getOneById(
    id: GetOperandType<T, "select", "id">,
    reply: FastifyReply,
  ) {
    const row = await this.operator.getOneById(id);
    return row ? reply.code(200).send(row) : reply.send(404);
  }

  /**
   * Get all users. Optional: query parameters
   * @param reply FastifyReply
   * @returns
   */
  public async getCount(reply: FastifyReply) {
    const { count } = (await this.operator.getCount()) as unknown as {
      count: number;
    };
    return reply.code(200).send(count);
  }

  /**
   * Add the given user
   * @param req FastifyRequest - req.body contains the user payload
   * @param reply FastifyReply
   * @returns
   */
  public async add(row: OperationDataType<T, "insert">, reply: FastifyReply) {
    const result = await this.operator.add(row);
    return reply.code(201).send(result);
  }

  /**
   * Update the user by ID
   * @param req FastifyRequest - req.params.id contains the user ID
   * @param reply FastifyReply
   *
   */
  public async update(
    id: GetOperandType<T, "update", "id">,
    row: OperationDataType<T, "update">,
    reply: FastifyReply,
  ) {
    const result = await this.operator.update(id, row);
    return reply.code(200).send(result);
  }

  /**
   *  Delete the user by ID
   * @param req FastifyRequest - req.params.id contains the user ID
   * @param reply FastifyReply
   *
   */
  public async delete(
    id: GetOperandType<T, "select", "id">,
    reply: FastifyReply,
  ) {
    const result = await this.operator.delete(id);
    return reply.code(204).send(result);
  }
}
