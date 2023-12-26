import { Injectable } from "@angular/core";
import { TableType } from "common/src/lib/kysely.models";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.tags;

@Injectable({
  providedIn: "root",
})
export class TagsManagerService extends TRPCService<TYPE> {
  public getAll() {
    return this.api.tags.getAll.query(undefined, {
      signal: this.ac.signal,
    });
  }
}
