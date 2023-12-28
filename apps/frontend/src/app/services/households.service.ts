import { Injectable } from "@angular/core";
import { getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.households;

@Injectable({
  providedIn: "root",
})
export class HouseholdsService extends TRPCService<TYPE> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getAll(_options?: getAllOptionsType, refresh: boolean = false) {
    // Disabling cached calls. Enable it if it becomes an issue
    return this.api.households.getAll.query(undefined, {
      signal: this.ac.signal,
    });

    /*
    return this.runCachedCall(
      this.api.households.getAll.query(undefined, {
        signal: this.ac.signal,
      }),
      "households.getAll",
      options,
      refresh,
    );
    */
  }

  public getAllWithPeopleCount(
    options?: getAllOptionsType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refresh: boolean = false,
  ) {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
    /*
    return this.runCachedCall(
      this.api.households.getAllWithPeopleCount.query(undefined, {
        signal: this.ac.signal,
      }),
      "households.getAllWithPeopleCount",
      options,
      refresh,
    );
    */
  }

  public getOneById(id: number) {
    return this.api.households.getOneById.query(id);
  }
}
