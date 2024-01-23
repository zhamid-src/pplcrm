import { IAuthKeyPayload, getAllOptionsType } from '@common';
import { QueryParams } from '../repositories/base.repository';
import { PersonsHouseholdsTagsRepository } from '../repositories/persons-households-tags.repository';
import { PersonsHouseholdsRepository } from '../repositories/persons-households.repository';
import { PersonsTagsRepository } from '../repositories/persons-tags-map.repository';
import { PersonsRepository } from '../repositories/persons.repository';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<'persons', PersonsRepository> {
  private personsTagsRepo = new PersonsTagsRepository();
  private personHouseholdTagsRepo = new PersonsHouseholdsTagsRepository();
  private personHouseholdRepo = new PersonsHouseholdsRepository();

  constructor() {
    super(new PersonsRepository());
  }

  public getAllWithAddress(options?: getAllOptionsType) {
    return this.personHouseholdTagsRepo.getAllWithAddress(
      options as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
    );
  }

  public getByHouseholdId(
    household_id: bigint,
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ) {
    return this.personHouseholdRepo.getByHouseholdId(
      household_id,
      auth.tenant_id,
      options as QueryParams<'persons' | 'households'>,
    );
  }

  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepository().getDistinctTags(auth.tenant_id);
  }

  public getTags(id: bigint, auth: IAuthKeyPayload) {
    return this.getRepository().getTags(id, auth.tenant_id);
  }
}
