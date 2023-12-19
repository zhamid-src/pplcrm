import { FastifyReply } from "fastify";
import { PersonsOperator } from "../db.operators/persons.operator";
import { GetOperandType, TableType } from "../kysely.models";
import { BaseController } from "./base.controller";

export class PersonsController extends BaseController<
  TableType.persons | TableType.households
> {
  constructor() {
    super(new PersonsOperator());
  }

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
