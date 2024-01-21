import { IAuthKeyPayload, getAllOptionsType } from '@common';
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
  public getAllWithAddress(options?: getAllOptionsType) {
    return this.getRepository().getAllWithAddress(options as QueryParams<'persons' | 'households'>);
  }

  /**
   * Get all the people in the given household
   *
   */
  public getByHouseholdId(
    household_id: bigint,
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ) {
    return this.getRepository().getByHouseholdId(
      household_id,
      auth.tenant_id,
      options as QueryParams<'persons' | 'households'>,
    );
  }
}
