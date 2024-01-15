/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { TagsRepository } from '../repositories/tags.repository';
import { BaseController } from './base.controller';

export class TagsController extends BaseController<'tags', TagsRepository> {
  constructor() {
    super(new TagsRepository());
  }

  public addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    } as OperationDataType<'tags', 'insert'>;
    return this.addOne(row);
  }

  public updateTag(id: bigint, input: UpdateTagType, auth: IAuthKeyPayload) {
    const payload = { ...input, updatedby_id: auth.user_id } as OperationDataType<'tags', 'insert'>;
    return this.update(id, payload);
  }

  public matchTag(key: string, auth: IAuthKeyPayload): Promise<{ name: string }[]> {
    return this.match(key, 'name', 'name', auth.tenant_id);
  }
}
