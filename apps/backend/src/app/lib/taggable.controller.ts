import { IAuthKeyPayload } from '@common';
import { TRPCError } from '@trpc/server';

import { Models, OperationDataType } from 'common/src/lib/kysely.models';
import { BaseController } from './base.controller';
import { BaseRepository } from './base.repo';
import { TagsRepo } from '../modules/tags/repositories/tags.repo';
import { MapTagsRepo } from './map-tags.repo';

/**
 * Base controller providing tag attachment functionality for entities.
 */
export abstract class TaggableController<
  T extends keyof Models,
  R extends BaseRepository<T>,
  M extends MapTagsRepo<any>,
> extends BaseController<T, R> {
  protected tagsRepo = new TagsRepo();
  protected abstract mapRepo: M;
  /** column name in mapping table for entity id */
  protected abstract entityIdColumn: string;

  /** attach a tag to entity */
  public async attachTag(id: string, name: string, auth: IAuthKeyPayload) {
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
      entity_id: id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    });
  }

  /** detach tag from entity by name */
  public async detachTag(input: { tenant_id: string; id: string; name: string }) {
    const tag = await this.tagsRepo.getIdByName({ tenant_id: input.tenant_id, name: input.name });
    if (tag?.id) {
      const mapId = await this.mapRepo.getId({ tenant_id: input.tenant_id, entity_id: input.id, tag_id: tag.id });
      if (mapId) {
        await this.mapRepo.delete({ tenant_id: input.tenant_id, id: mapId });
      }
    }
  }

  /** get distinct tags for entity table */
  public getDistinctTags(auth: IAuthKeyPayload) {
    return (this as any).getRepo().getDistinctTags(auth.tenant_id);
  }

  /** get tags for entity */
  public getTags(id: string, auth: IAuthKeyPayload) {
    return (this as any).getRepo().getTags({ id, tenant_id: auth.tenant_id });
  }

  private async addToMap(row: {
    tag_id: string | undefined;
    entity_id: string;
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

    const mapRow: any = {
      tag_id: row.tag_id,
      tenant_id: row.tenant_id,
      createdby_id: row.createdby_id,
      updatedby_id: row.updatedby_id,
      [this.entityIdColumn]: row.entity_id,
    };

    return this.mapRepo.add({ row: mapRow as OperationDataType<any, 'insert'> });
  }
}
