import { PersonsOperator } from '../db.operators/persons.operator';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<'persons', PersonsOperator> {
  constructor() {
    super(new PersonsOperator());
  }
}
