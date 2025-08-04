import { IAuthKeyPayload, SettingsType, UpdateHouseholdsType, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';

import { QueryParams } from '../repositories/base.repo';
import { HouseholdRepo } from '../repositories/households.repo';
import { MapHouseholdsTagsRepo } from '../repositories/map-households-tags.repo';
import { TagsRepo } from '../repositories/tags.repo';
import { BaseController } from './base.controller';
import { SettingsController } from './settings.controller';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Controller for managing household records and their associated tags.
 */
export class HouseholdsController extends BaseController<'households', HouseholdRepo> {
  private mapHouseholdsTagRepo = new MapHouseholdsTagsRepo();
  private settingsController = new SettingsController();
  private tagsRepo = new TagsRepo();

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
   * Attach a tag to a household. Creates the tag if it doesn't exist.
   *
   * @param household_id - ID of the household to tag
   * @param name - Name of the tag to attach
   * @param auth - Auth context
   * @returns The result of the map insertion
   */
  public async attachTag(household_id: string, name: string, auth: IAuthKeyPayload) {
    const row = {
      name,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    };

    const tag = await this.tagsRepo.addOrGet({
      row: row as OperationDataType<'tags', 'insert'>,
      onConflictColumn: 'name',
    });

    return this.addToMap({
      tag_id: tag?.id as string | undefined,
      household_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    });
  }

  /**
   * Detach (remove) a tag from a household by name.
   *
   * @param tenant_id - Tenant ID
   * @param household_id - Household ID
   * @param tag_name - Name of the tag to remove
   */
  public async detachTag(tenant_id: string, household_id: string, tag_name: string) {
    const tag = await this.tagsRepo.getIdByName({ tenant_id, name: tag_name });
    if (tag?.id) {
      const mapId = await this.mapHouseholdsTagRepo.getId(tenant_id, household_id, tag.id);
      if (mapId) {
        await this.mapHouseholdsTagRepo.delete({ tenant_id, id: mapId });
      }
    }
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

  /**
   * Get a list of all distinct tags used across households for a tenant.
   *
   * @param auth - Auth context
   * @returns List of unique tag names
   */
  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  /**
   * Get all tags associated with a specific household.
   *
   * @param id - Household ID
   * @param auth - Auth context
   * @returns List of tags for the household
   */
  public getTags(id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags(id, auth.tenant_id);
  }

  /**
   * Internal method to link a tag to a household in the mapping table.
   *
   * @param row - Mapping row containing tag ID and household ID
   * @returns The result of the insert operation
   * @throws TRPCError if tag_id is missing
   */
  private async addToMap(row: {
    tag_id: string | undefined;
    household_id: string;
    tenant_id: string;
    createdby_id: string;
    updatedby_id: string;
  }) {
    if (!row.tag_id) {
      throw new TRPCError({
        message: 'Failed to add the tag',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    return await this.mapHouseholdsTagRepo.add({
      row: row as OperationDataType<'map_households_tags', 'insert'>,
    });
  }
}
