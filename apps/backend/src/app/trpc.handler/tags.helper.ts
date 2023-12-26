/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAuthKeyPayload, addTagType } from "@common";
import { TagsOperator } from "../db.operators/tags.operator";

const tags: TagsOperator = new TagsOperator();

export class TagsHelper {
  public getOneById(id: bigint) {
    return tags.getOneById(id);
  }
  public getOneByName(name: string) {
    return tags.getOneByName(name);
  }
  public getAll() {
    return tags.getAll();
  }
  public add(payload: addTagType, auth: IAuthKeyPayload) {
    // get the current user's id and tenant id
    return tags.add({
      name: payload.name,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }
}
