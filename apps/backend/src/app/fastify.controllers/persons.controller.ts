import { FastifyReply } from 'fastify';
import { PersonsOperator } from '../db.operators/persons.operator';
import { TableType } from '../kysely.models';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<TableType.persons> {
  constructor() {
    super(new PersonsOperator());
  }

  async getPersonsInHousehold(id: any, reply: FastifyReply) {
    const persons = await (
      this.operator as PersonsOperator
    ).getPersonsInHousehold(id);
    return persons ? reply.code(200).send(persons) : reply.send(404);
  }
}
