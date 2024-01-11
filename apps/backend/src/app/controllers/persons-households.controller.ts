import { getAllOptionsType } from '@common';
import { QueryParams } from '../db.operators/base.operator';
import { PersonsHouseholdsOperator } from '../db.operators/persons-households.operator';
import { BaseController } from './base.controller';

export class PersonsHouseholdsController extends BaseController<
  'persons' | 'households',
  PersonsHouseholdsOperator
> {
  constructor() {
    super(new PersonsHouseholdsOperator());
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
