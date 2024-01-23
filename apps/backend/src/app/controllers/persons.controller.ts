import { IAuthKeyPayload, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { QueryParams } from '../repositories/base.repository';
import { MapPersonsTagRepo } from '../repositories/map-persons-tags';
import { PersonsRepo } from '../repositories/persons.repository';
import { TagsRepo } from '../repositories/tags.repository';
import { BaseController } from './base.controller';

export class PersonsController extends BaseController<'persons', PersonsRepo> {
  private tagsRepo = new TagsRepo();
  private mapPersonsTagRepo = new MapPersonsTagRepo();

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
  public addTag(id: bigint, tag_name: string, auth: IAuthKeyPayload) {
    // Two things:
    // Check if the tag_name exists. If it does, get the ID. If it doesn't, then add it.
    // Use the ID to add the tag to the map.
    const row = {
      name: tag_name,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    } as OperationDataType<'tags', 'insert'>;
    this.tagsRepo.addOrGet(row, 'name').then((tag) => {
      console.log('**************', tag);
      if (!tag) {
        throw new TRPCError({
          message: 'Failed to add the tag',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
      const mapRow = {
        person_id: BigInt(id),
        tag_id: BigInt(tag.id),
        tenant_id: auth.tenant_id,
        createdby_id: auth.user_id,
      } as OperationDataType<'map_peoples_tags', 'insert'>;
      this.mapPersonsTagRepo.add(mapRow);
    });
  }
}
