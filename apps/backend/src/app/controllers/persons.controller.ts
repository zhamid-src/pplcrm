import { IAuthKeyPayload, getAllOptionsType } from '@common';
import { QueryParams } from '../repositories/base.repository';
import { PersonsHouseholdsTagsRepository } from '../repositories/persons-households-tags.repository';
import { PersonsTagsRepository } from '../repositories/persons-tags-map.repository';
import { PersonsRepository } from '../repositories/persons.repository';
import { BaseController } from './base.controller';
import { PersonsHouseholdsController } from './persons-households.controller';

export class PersonsController extends BaseController<'persons', PersonsRepository> {
  private personsHouseholdsController = new PersonsHouseholdsController();
  private personsTagsRepo = new PersonsTagsRepository();
  private personHouseholdTagsRepo = new PersonsHouseholdsTagsRepository();

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
    return this.personsHouseholdsController.getByHouseholdId(household_id, auth, options);
  }

  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.personsTagsRepo.getDistinctTags(auth.tenant_id);
  }

  public getTags(id: bigint, auth: IAuthKeyPayload) {
    return this.personsTagsRepo.getTags(id, auth.tenant_id);
  }
}
