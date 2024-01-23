/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAuthKeyPayload } from '@common';
import { HouseholdRepo } from '../repositories/households.repository';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households', HouseholdRepo> {
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
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  public getTags(id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags(id, auth.tenant_id);
  }
}
