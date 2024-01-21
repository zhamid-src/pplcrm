import { IAuthKeyPayload, getAllOptionsType } from '@common';
import { PersonsTagsRepository } from '../repositories/persons-tags-map.repository';
import { PersonsRepository } from '../repositories/persons.repository';
import { BaseController } from './base.controller';
import { PersonsHouseholdsController } from './persons-households.controller';

export class PersonsController extends BaseController<'persons', PersonsRepository> {
  private personsHouseholdsController = new PersonsHouseholdsController();
  private personsTagsRepo = new PersonsTagsRepository();

  constructor() {
    super(new PersonsRepository());
  }

  public getAllWithAddress(options?: getAllOptionsType) {
    return this.personsHouseholdsController.getAllWithAddress(options);
  }

  public getByHouseholdId(
    household_id: bigint,
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ) {
    return this.personsHouseholdsController.getByHouseholdId(household_id, auth, options);
  }

  public getTags(id: bigint, tenant_id: bigint) {
    return this.personsTagsRepo.getTags(id, tenant_id);
  }
}
