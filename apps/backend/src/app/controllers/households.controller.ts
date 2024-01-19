/* eslint-disable @typescript-eslint/no-unused-vars */
import { HouseholdRepository } from '../repositories/households.repository';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households', HouseholdRepository> {
  constructor() {
    super(new HouseholdRepository());
  }

  /**
   * @returns All households with the number of people in each household
   */
  public getAllWithPeopleCount() {
    return this.getRepository().getAllWithPeopleCount();
  }
}
