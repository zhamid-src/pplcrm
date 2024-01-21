/* eslint-disable @typescript-eslint/no-unused-vars */
import { HouseholdsTagsRepository } from '../repositories/households-tags-map.repository';
import { HouseholdRepository } from '../repositories/households.repository';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households', HouseholdRepository> {
  private householdsTagsRepo = new HouseholdsTagsRepository();
  constructor() {
    super(new HouseholdRepository());
  }

  /**
   * @returns All households with the number of people in each household
   */
  public getAllWithPeopleCount() {
    return this.getRepository().getAllWithPeopleCount();
  }
  public getTags(id: bigint, tenant_id: bigint) {
    return this.householdsTagsRepo.getTags(id, tenant_id);
  }
}
