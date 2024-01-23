import { IAuthKeyPayload, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { QueryParams } from '../repositories/base.repo';
import { MapPersonsTagRepo } from '../repositories/map-persons-tags.repo';
import { PersonsRepo } from '../repositories/persons.repo';
import { TagsRepo } from '../repositories/tags.repo';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<'persons', PersonsRepo> {
  private mapPersonsTagRepo = new MapPersonsTagRepo();
  private tagsRepo = new TagsRepo();

  constructor() {
    super(new PersonsRepo());
  }

  /**
   * Add a tag to a person. If the tag doesn't exist, it will be added.
   * * @param person_id of the person
   */
  public async addTag(person_id: string, name: string, auth: IAuthKeyPayload) {
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
      person_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }

  /**
   * Get all people with their address and tags
   */
  public getAllWithAddress(options?: getAllOptionsType) {
    return this.getRepo().getAllWithAddress(
      options as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
    );
  }

  /**
   * Get all people in the given household
   */
  public getByHouseholdId(
    household_id: string,
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ) {
    return this.getRepo().getByHouseholdId(
      household_id,
      auth.tenant_id,
      options as QueryParams<'persons'>,
    );
  }

  /**
   * Get all the distinct tags that are assigned to 'persons'.
   */
  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  /**
   * Get tags assigned to this person
   */
  public getTags(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags(person_id, auth.tenant_id);
  }

  /**
   * Remove the tag from the person
   * @param person_id of the person
   * @param tag_name - name of the tag to remove
   */
  public async removeTag(tenant_id: string, person_id: string, tag_name: string) {
    const tag = await this.tagsRepo.getIdByName(tenant_id, tag_name);
    if (tag?.id) {
      const mapId = await this.mapPersonsTagRepo.getId(tenant_id, person_id, tag.id!);
      if (mapId) {
        this.mapPersonsTagRepo.delete(tenant_id, mapId);
      }
    }
  }

  /**
   * Map the tag ID to the person ID
   */
  private addToMap(row: {
    tag_id: string | undefined;
    person_id: string;
    tenant_id: string;
    createdby_id: string;
  }) {
    if (!row.tag_id) {
      throw new TRPCError({
        message: 'Failed to add the tag',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    this.mapPersonsTagRepo.add(row as OperationDataType<'map_peoples_tags', 'insert'>);
  }
}
