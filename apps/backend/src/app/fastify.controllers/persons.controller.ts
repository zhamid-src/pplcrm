import { FastifyReply } from 'fastify';
import { GetOperandType } from '../../../../../common/src/lib/kysely.models';
import { PersonsHouseholdsOperator } from '../db.operators/persons-households.operator';
import { BaseController } from './base.controller';

/**
 * Persons controller
 */
export class PersonsController extends BaseController<'persons' | 'households'> {
  constructor() {
    super(new PersonsHouseholdsOperator());
  }

  public async getPersonsInHousehold(
    id: GetOperandType<'persons', 'select', 'id'>,
    reply: FastifyReply,
  ) {
    const persons = await (this.operator as PersonsHouseholdsOperator).getPersonsInHousehold(id);
    return persons ? reply.code(200).send(persons) : reply.send(404);
  }
}
