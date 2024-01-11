import { PersonsRepository } from '../repositories/persons.repository';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<'persons', PersonsRepository> {
  constructor() {
    super(new PersonsRepository());
  }
}
