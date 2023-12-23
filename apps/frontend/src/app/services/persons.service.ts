import { Injectable } from "@angular/core";
import { getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.persons | TableType.households;

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService<TYPE> {
  public getAllWithHouseholds(
    options?: getAllOptionsType,
    refresh: boolean = false,
  ) {
    return this.runCachedCall(
      this.api.persons.getAllWithHouseholds.query(options, {
        signal: this.ac.signal,
      }),
      "persons.getAllWithHouseholds",
      options,
      refresh,
    );
  }

  public getOneById(id: number) {
    // No need to run the cached call for getting just one
    return this.api.persons.getOneById.query(id);
  }
}
