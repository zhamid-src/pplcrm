/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';
import { TagsOperator } from '../db.operators/tags.operator';

const tags: TagsOperator = new TagsOperator();

export class TagsHelper {
  public add(payload: AddTagType, auth: IAuthKeyPayload) {
    return tags.addOne({
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }

  public async delete(id: number) {
    return tags.deleteOne(BigInt(id));
  }

  public async deleteMany(ids: number[]) {
    return tags.deleteMany(ids.map((id) => BigInt(id)));
  }

  public findAll() {
    return tags.findAll();
  }

  public findOne(param: bigint | string) {
    return tags.findOne(param);
  }

  public async update(id: number, input: UpdateTagType, auth: IAuthKeyPayload) {
    const payload = { ...input, updatedby_id: auth.user_id };
    return tags.updateOne(BigInt(id), payload);
  }
}
