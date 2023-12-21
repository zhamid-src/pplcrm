import { Injectable } from "@angular/core";
import { getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { CachedTRPCService } from "./cached-trpc.service";

export type TYPE = TableType.households;

@Injectable({
  providedIn: "root",
})
export class HouseholdsService extends CachedTRPCService<TYPE> {
  public getAll(options?: getAllOptionsType, refresh: boolean = false) {
    return this.runCachedCall(
      this.api.households.getAll.query(undefined, {
        signal: this.ac.signal,
      }),
      "households.getAll",
      options,
      refresh,
    );
  }

  public getAllWithPeopleCount(
    options?: getAllOptionsType,
    refresh: boolean = false,
  ) {
    return this.runCachedCall(
      this.api.households.getAllWithPeopleCount.query(undefined, {
        signal: this.ac.signal,
      }),
      "households.getAllWithPeopleCount",
      options,
      refresh,
    );
  }

  public getOneById(id: number) {
    return this.api.households.getOneById.query(id);
  }
}
