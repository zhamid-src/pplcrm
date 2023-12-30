import { Injectable } from "@angular/core";
import { AddTagType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.tags;

@Injectable({
  providedIn: "root",
})
export class TagsService extends TRPCService<TYPE> {
  public getAll() {
    return this.api.tags.getAll.query(undefined, {
      signal: this.ac.signal,
    });
  }
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }
  public update(id: number, data: AddTagType) {
    return this.api.tags.update.mutate({ id, data });
  }
  public deleteMany(ids: number[]) {
    return this.api.tags.deleteMany.mutate(ids);
  }
}
