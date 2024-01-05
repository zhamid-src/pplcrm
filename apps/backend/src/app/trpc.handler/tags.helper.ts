/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload, UpdateTagType } from "@common";
import { TagsOperator } from "../db.operators/tags.operator";

const tags: TagsOperator = new TagsOperator();

export class TagsHelper {
  public add(payload: AddTagType, auth: IAuthKeyPayload) {
    // get the current user's id and tenant id
    return tags.add({
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }

  /**
   * Delete the given tag (by ID)
   * @param id
   * @returns
   */
  public async delete(id: number) {
    return tags.delete(BigInt(id));
  }

  /**
   * Delete all tags that matches all given IDs
   * @param ids
   * @returns
   */
  public async deleteMany(ids: number[]) {
    return tags.deleteMany(ids.map((id) => BigInt(id)));
  }

  /**
   * Get all tags
   * @returns tags
   */
  public getAll() {
    return tags.getAll();
  }

  /**
   * Get the tag that matches the given ID
   * @param id
   * @returns
   */
  public getOneById(id: bigint) {
    return tags.getOneById(id);
  }

  /**
   * Get the tag given the name
   * @param name
   * @returns
   */
  public getOneByName(name: string) {
    return tags.getOneByName(name);
  }

  /**
   * Update the tag that matches the given ID
   * @param id
   * @param input
   * @param auth
   * @returns
   */
  public async update(id: number, input: UpdateTagType, auth: IAuthKeyPayload) {
    const payload = { ...input, updatedby_id: auth.user_id };
    return tags.update(BigInt(id), payload);
  }
}
