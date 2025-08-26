import { IAuthKeyPayload, SettingsType, UpdateHouseholdsType, getAllOptionsType } from '@common';

import { QueryParams } from '../../lib/base.repo';
import { HouseholdRepo } from './repositories/households.repo';
import { MapHouseholdsTagsRepo } from './repositories/map-households-tags.repo';
import { SettingsController } from '../settings/controller';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { TaggableController } from '../../lib/taggable.controller';

/**
 * Controller for managing household records and their associated tags.
 */
export class HouseholdsController extends TaggableController<'households', HouseholdRepo, MapHouseholdsTagsRepo> {
  protected mapRepo = new MapHouseholdsTagsRepo();
  protected entityIdColumn = 'household_id';
  private settingsController = new SettingsController();

  constructor() {
    super(new HouseholdRepo());
  }

  /**
   * Add a new household entry for the authenticated user's tenant.
   *
   * @param payload - Household data to insert
   * @param auth - Auth context with tenant and user ID
   * @returns The created household
   */
  public async addHousehold(payload: UpdateHouseholdsType, auth: IAuthKeyPayload) {
    const campaign_id = (await this.settingsController.getCurrentCampaignId(auth)) as SettingsType;

    const row = {
      ...payload,
      campaign_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    };
    return this.add(row as OperationDataType<'households', 'insert'>);
  }

  /**
   * Get all households and include the count of people in each household.
   *
   * @param auth - Auth context
   * @returns Array of households with people counts
   */
  public getAllWithPeopleCount(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    const { tags, ...queryParams } = options || {};
    return this.getRepo().getAllWithPeopleCount({
      tenant_id: auth.tenant_id,
      options: queryParams as QueryParams<'households' | 'tags' | 'map_households_tags' | 'persons'>,
      tags,
    });
  }

  // tag methods inherited from TaggableController
}
