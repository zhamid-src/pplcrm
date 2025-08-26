import { IAuthKeyPayload, SettingsType, UpdatePersonsType, getAllOptionsType } from '@common';

import { QueryParams } from '../../lib/base.repo';
import { MapPersonsTagRepo } from './repositories/map-persons-tags.repo';
import { PersonsRepo } from './repositories/persons.repo';
import { SettingsController } from '../settings/controller';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { TaggableController } from '../../lib/taggable.controller';

/**
 * Controller for managing persons and their associated tags.
 */
export class PersonsController extends TaggableController<'persons', PersonsRepo, MapPersonsTagRepo> {
  protected mapRepo = new MapPersonsTagRepo();
  protected entityIdColumn = 'person_id';
  private settingsController = new SettingsController();

  constructor() {
    super(new PersonsRepo());
  }

  /**
   * Add a new person to the database under the authenticated tenant.
   *
   * @param payload - The person data
   * @param auth - Authenticated user's context
   * @returns The newly created person
   */
  public async addPerson(payload: UpdatePersonsType, auth: IAuthKeyPayload) {
    const campaign_id = (await this.settingsController.getCurrentCampaignId(auth)) as SettingsType;

    const row = {
      ...payload,
      campaign_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    };

    return this.add(row as OperationDataType<'persons', 'insert'>);
  }

  /**
   * Get all people with their address and any assigned tags.
   *
   * @param auth - Authenticated user's context
   * @param options - Query filters (pagination, sorting, tag filters)
   * @returns A list of persons with address and tags
   */
  public getAllWithAddress(
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ): Promise<{ rows: { [x: string]: unknown }[]; count: number }> {
    const { tags, ...queryParams } = options || {};
    return this.getRepo().getAllWithAddress({
      tenant_id: auth.tenant_id,
      options: queryParams as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
      tags,
    });
  }

  /**
   * Get all persons that belong to a given household.
   *
   * @param household_id - Household ID
   * @param auth - Authenticated user's context
   * @param options - Optional query filters
   * @returns A list of persons in the household
   */
  public getByHouseholdId(household_id: string, auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getByHouseholdId({
      id: household_id,
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'persons'>,
    });
  }

  // tag methods inherited from TaggableController
}
