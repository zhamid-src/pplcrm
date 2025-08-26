import { IAuthKeyPayload, SettingsType, UpdatePersonsType, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';

import { QueryParams } from '../../lib/base.repo';
import { MapPersonsTagRepo } from './repositories/map-persons-tags.repo';
import { PersonsRepo } from './repositories/persons.repo';
import { TagsRepo } from '../tags/repositories/tags.repo';
import { BaseController } from '../../lib/base.controller';
import { SettingsController } from '../settings/controller';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Controller for managing persons and their associated tags.
 */
export class PersonsController extends BaseController<'persons', PersonsRepo> {
  private mapPersonsTagRepo = new MapPersonsTagRepo();
  private settingsController = new SettingsController();
  private tagsRepo = new TagsRepo();

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
   * Attach a tag to a person. If the tag does not exist, it will be created.
   *
   * @param person_id - ID of the person
   * @param name - Tag name
   * @param auth - Authenticated user's context
   * @returns The tag-to-person mapping result
   */
  public async attachTag(person_id: string, name: string, auth: IAuthKeyPayload) {
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
      person_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    });
  }

  /**
   * Detach a tag from a person by tag name.
   *
   * @param input - Object containing tenant_id, person_id, and tag name
   */
  public async detachTag(input: { tenant_id: string; person_id: string; name: string }) {
    const tag = await this.tagsRepo.getIdByName(input);

    if (tag?.id) {
      const id = await this.mapPersonsTagRepo.getId({
        ...input,
        tag_id: tag.id,
      });
      if (id) {
        await this.mapPersonsTagRepo.delete({ tenant_id: input.tenant_id, id });
      }
    }
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

  /**
   * Get all distinct tags assigned to any person in the tenant.
   *
   * @param auth - Authenticated user's context
   * @returns A list of unique tags
   */
  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  /**
   * Get all tags associated with a specific person.
   *
   * @param person_id - Person ID
   * @param auth - Authenticated user's context
   * @returns A list of tags assigned to the person
   */
  public getTags(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags({ id: person_id, tenant_id: auth.tenant_id });
  }

  /**
   * Link a tag ID to a person ID in the mapping table.
   *
   * @param row - Mapping data
   * @returns The result of the insert operation
   * @throws TRPCError if tag_id is missing
   */
  private async addToMap(row: {
    tag_id: string | undefined;
    person_id: string;
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

    return await this.mapPersonsTagRepo.add({
      row: row as OperationDataType<'map_peoples_tags', 'insert'>,
    });
  }
}
