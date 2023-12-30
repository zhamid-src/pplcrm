/* eslint-disable @typescript-eslint/no-unused-vars */
import { AddTagType, IAuthKeyPayload } from "@common";
import { OperationDataType, TableType } from "common/src/lib/kysely.models";
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
  public add(payload: AddTagType, auth: IAuthKeyPayload) {
    // get the current user's id and tenant id
    return tags.add({
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    });
  }
  public async update(id: number, input: AddTagType) {
    return tags.update(
      BigInt(id),
      input as Partial<OperationDataType<TableType.tags, "update">>,
    );
  }

  public async delete(id: number) {
    return tags.delete(BigInt(id));
  }
  public async deleteMany(ids: number[]) {
    return tags.deleteMany(ids.map((id) => BigInt(id)));
  }
}
