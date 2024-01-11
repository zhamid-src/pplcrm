import { getAllOptionsType } from '@common';
import { QueryParams } from '../repositories/base.repository';
import { PersonsHouseholdsRepository } from '../repositories/persons-households.repository';
import { BaseController } from './base.controller';

export class PersonsHouseholdsController extends BaseController<
  'persons' | 'households',
  PersonsHouseholdsRepository
> {
  constructor() {
    super(new PersonsHouseholdsRepository());
  }

  public override findAll(options?: getAllOptionsType) {
    return this.getOperator().findAll(options as QueryParams<'persons' | 'households'>);
  }

  public getPersonsInHouseholds(
    household_id: bigint,
    options?: QueryParams<'persons' | 'households'>,
  ) {
    return this.getOperator().getPersonsInHousehold(household_id, options);
  }
}
