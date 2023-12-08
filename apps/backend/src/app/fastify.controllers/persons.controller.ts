import { FastifyReply } from "fastify";
import { PersonsOperator } from "../db.operators/persons.operator";
import { TableType } from "../kysely.models";
import { BaseController } from "./base.controller";

export class PersonsController extends BaseController<TableType.persons> {
  // #region Constructors (1)

  constructor() {
    super(new PersonsOperator());
  }

  // #endregion Constructors (1)

  // #region Public Methods (1)

  public async getPersonsInHousehold(id: string, reply: FastifyReply) {
    const persons = await (
      this.operator as PersonsOperator
    ).getPersonsInHousehold(id);
    return persons ? reply.code(200).send(persons) : reply.send(404);
  }

  // #endregion Public Methods (1)
}
