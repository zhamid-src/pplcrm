/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAuthKeyPayload } from '@common';
import { HouseholdsTagsRepository } from '../repositories/households-tags-map.repository';
import { HouseholdRepo } from '../repositories/households.repository';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households', HouseholdRepo> {
  private householdsTagsRepo = new HouseholdsTagsRepository();

  constructor() {
    super(new HouseholdRepo());
  }

  /**
   * @returns All households with the number of people in each household
   */
  public getAllWithPeopleCount() {
    return this.getRepo().getAllWithPeopleCount();
  }

  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.householdsTagsRepo.getDistinctTags(auth.tenant_id);
  }

  public getTags(id: bigint, auth: IAuthKeyPayload) {
    return this.householdsTagsRepo.getTags(id, auth.tenant_id);
  }
}
