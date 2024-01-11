/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';
import { TagsOperator } from '../db.operators/tags.operator';
import { BaseController } from './base.controller';

export class TagsController extends BaseController<'tags', TagsOperator> {
  constructor() {
    super(new TagsOperator());
  }

  public addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    return this.addOne({
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }

  public async updateTag(id: bigint, input: UpdateTagType, auth: IAuthKeyPayload) {
    const payload = { ...input, updatedby_id: auth.user_id };
    return this.update(BigInt(id), payload);
  }
}
