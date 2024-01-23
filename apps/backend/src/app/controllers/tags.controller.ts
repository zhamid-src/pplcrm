/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { TagsRepo } from '../repositories/tags.repository';
import { BaseController } from './base.controller';

export class TagsController extends BaseController<'tags', TagsRepo> {
  constructor() {
    super(new TagsRepo());
  }

  /**
   * Add the new tag to the database.
   */
  public addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    } as OperationDataType<'tags', 'insert'>;
    return this.add(row);
  }

  /**
   * Given the key, return the first three tags that match the key.
   */
  public findByName(name: string, auth: IAuthKeyPayload): Promise<{ name: string }[]> {
    return this.find(name, 'name', auth.tenant_id);
  }

  /**
   * Update the tag that matches the given ID
   */
  public updateTag(id: bigint, input: UpdateTagType, auth: IAuthKeyPayload) {
    const payload = { ...input, updatedby_id: auth.user_id } as OperationDataType<'tags', 'insert'>;
    return this.update(id, payload);
  }
}
