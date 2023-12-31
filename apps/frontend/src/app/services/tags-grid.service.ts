import { Injectable } from "@angular/core";
import { AddTagType, UpdateTagType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { BaseGridService } from "./base-grid.service";

export type TYPE = TableType.tags;

@Injectable({
  providedIn: "root",
})
export class TagsGridService extends BaseGridService<TYPE, AddTagType> {
  public refresh() {
    return this.getAll();
  }
  public getAll() {
    return this.api.tags.getAll.query(undefined, {
      signal: this.ac.signal,
    });
  }
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }
  public update(id: number, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id, data });
  }
  public getOneById(id: number) {
    return this.api.tags.getOneById.query(BigInt(id));
  }
  public deleteMany(ids: number[]): Promise<boolean> {
    return this.api.tags.deleteMany
      .mutate(ids)
      .then(() => true)
      .catch(() => false);
  }
}
