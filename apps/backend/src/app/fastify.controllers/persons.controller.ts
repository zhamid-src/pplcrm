import { FastifyReply } from "fastify";
import {
  GetOperandType,
  TableType,
} from "../../../../../common/src/lib/kysely.models";
import { PersonsOperator } from "../db.operators/persons.operator";
import { BaseController } from "./base.controller";

/**
 * Persons controller
 */
export class PersonsController extends BaseController<
  TableType.persons | TableType.households
> {
  constructor() {
    super(new PersonsOperator());
  }

  /**
   * Get all persons in the given household
   * @param id
   * @param reply
   * @returns 200 - persons in the household, 404 if not found
   */
  public async getPersonsInHousehold(
    id: GetOperandType<TableType.persons, "select", "id">,
    reply: FastifyReply,
  ) {
    const persons = await (
      this.operator as PersonsOperator
    ).getPersonsInHousehold(id);
    return persons ? reply.code(200).send(persons) : reply.send(404);
  }
}
