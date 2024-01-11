/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';
import { TagsOperator } from '../db.operators/tags.operator';

export class TagsHelper {
  private tags: TagsOperator = new TagsOperator();

  public add(payload: AddTagType, auth: IAuthKeyPayload) {
    return this.tags.addOne({
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }

  public async delete(id: bigint) {
    return this.tags.deleteOne(BigInt(id));
  }

  public findAll() {
    return this.tags.findAll();
  }

  public findOne(param: bigint | string) {
    return this.tags.findOne(param);
  }

  public async update(id: bigint, input: UpdateTagType, auth: IAuthKeyPayload) {
    const payload = { ...input, updatedby_id: auth.user_id };
    return this.tags.updateOne(BigInt(id), payload);
  }
}
