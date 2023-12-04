import { FastifyReply } from 'fastify';
import { sql } from 'kysely';
import { db } from '../kysely';
import { Int8 } from '../kyselySchema/base.schema';
import { TableType } from '../kyselySchema/db.schema';

export class BaseController {
  protected table: TableType;

  constructor(tableIn: TableType) {
    this.table = tableIn;
  }

  /**
   * Get all users. Optional: query parameters.
   *
   * @param reply FastifyReply
   * @returns
   */
  public async getAll(reply: FastifyReply) {
    const result = await db.selectFrom(this.table).selectAll().execute();
    return result ? reply.code(200).send(result) : reply.send(404);
  }

  /**
   * Get the user by ID
   * @param req FastifyRequest - req.params.id contains the user ID
   * @param reply FastifyReply
   * @returns
   */
  public async getById(id: string, reply: FastifyReply) {
    const row = await db.selectFrom(this.table).selectAll().where('id', '=', id).executeTakeFirst();
    return row ? reply.code(200).send(row) : reply.send(404);
  }

  /**
   * Get all users. Optional: query parameters
   * @param reply FastifyReply
   * @returns
   */
  public async getCount(reply: FastifyReply) {
    const { count } = (await db
      .selectFrom(this.table)
      .select(sql<string>`count(*)`.as('count'))
      .executeTakeFirst()) as unknown as { count: number };
    return reply.code(200).send(count);
  }

  /**
   * Add the given user
   * @param req FastifyRequest - req.body contains the user payload
   * @param reply FastifyReply
   * @returns
   */
  public async add(row: never, reply: FastifyReply) {
    const result = await db.insertInto(this.table).values(row).executeTakeFirst();
    return reply.code(201).send(result);
  }

  /**
   * Update the user by ID
   * @param req FastifyRequest - req.params.id contains the user ID
   * @param reply FastifyReply
   *
   */
  public async update(id: Int8, row: never, reply: FastifyReply) {
    const result = await db.updateTable(this.table).set(row).where('id', '=', id).executeTakeFirst();
    return reply.code(200).send(result);
  }

  /**
   *  Delete the user by ID
   * @param req FastifyRequest - req.params.id contains the user ID
   * @param reply FastifyReply
   *
   */
  public async delete(id: Int8, reply: FastifyReply) {
    const result = await db.deleteFrom(this.table).where('id', '=', id).executeTakeFirst();
    return reply.code(204).send(result);
  }
}
