import { IAuthKeyPayload, getAllOptionsType } from '@common';
import { QueryParams } from '../repositories/base.repository';
import { PersonsRepo } from '../repositories/persons.repository';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<'persons', PersonsRepo> {
  constructor() {
    super(new PersonsRepo());
  }

  public getAllWithAddress(options?: getAllOptionsType) {
    return this.getRepo().getAllWithAddress(
      options as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
    );
  }

  public getByHouseholdId(
    household_id: bigint,
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ) {
    return this.getRepo().getByHouseholdId(
      household_id,
      auth.tenant_id,
      options as QueryParams<'persons'>,
    );
  }

  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  public getTags(id: bigint, auth: IAuthKeyPayload) {
    return this.getRepo().getTags(id, auth.tenant_id);
  }
}
