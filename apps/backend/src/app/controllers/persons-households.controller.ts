import { getAllOptionsType } from '@common';
import { QueryParams } from '../repositories/base.repository';
import { PersonsHouseholdsRepository } from '../repositories/persons-households.repository';
import { BaseController } from './base.controller';

/**
 * Controller used to handle requests that involve both the persons and households tables.
 */
export class PersonsHouseholdsController extends BaseController<
  'persons' | 'households',
  PersonsHouseholdsRepository
> {
  constructor() {
    super(new PersonsHouseholdsRepository());
  }

  /**
   * Find all the rows that match the given options.
   * @param options
   * @returns
   */
  public override getAll(options?: getAllOptionsType) {
    return this.getRepository().getAll(options as QueryParams<'persons' | 'households'>);
  }

  /**
   * Get all the people in the given household
   *
   */
  public getPersonsInHouseholds(
    household_id: bigint,
    options?: QueryParams<'persons' | 'households'>,
  ) {
    return this.getRepository().getPersonsInHousehold(household_id, options);
  }
}
