/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAuthKeyPayload } from '@common';
import { TRPCError } from '@trpc/server';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { HouseholdRepo } from '../repositories/households.repo';
import { MapHouseholdsTagsRepo } from '../repositories/map-households-tags.repo';
import { TagsRepo } from '../repositories/tags.repo';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households', HouseholdRepo> {
  private mapHouseholdsTagRepo = new MapHouseholdsTagsRepo();
  private tagsRepo = new TagsRepo();

  constructor() {
    super(new HouseholdRepo());
  }

  /**
   * Add a tag to a household. If the tag doesn't exist, it will be added.
   * * @param household_id of the household
   */
  public async addTag(household_id: string, name: string, auth: IAuthKeyPayload) {
    // Two things:
    // Check if the tag_name exists. If it does, get the ID. If it doesn't, then add it.
    // Use the ID to add the tag to the map.
    const row = {
      name,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    } as OperationDataType<'tags', 'insert'>;

    const tag = await this.tagsRepo.addOrGet(row, 'name');
    return this.addToMap({
      tag_id: tag?.id,
      household_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
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

  /**
   * Remove the tag from the household
   * @param household_id of the household
   * @param tag_name - name of the tag to remove
   */
  public async removeTag(household_id: string, tag_name: string) {
    const tag = await this.tagsRepo.getIdByName(tag_name);
    if (tag?.id) {
      const mapId = await this.mapHouseholdsTagRepo.getId(household_id, tag.id!);
      if (mapId) {
        this.mapHouseholdsTagRepo.delete(mapId);
      }
    }
  }

  /**
   * Map the tag ID to the household ID
   */
  private addToMap(row: {
    tag_id: string | undefined;
    household_id: string;
    tenant_id: string;
    createdby_id: string;
  }) {
    if (!row.tag_id) {
      throw new TRPCError({
        message: 'Failed to add the tag',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    this.mapHouseholdsTagRepo.add(row as OperationDataType<'map_households_tags', 'insert'>);
  }
}
