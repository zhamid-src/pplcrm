import { Injectable } from "@angular/core";
import { getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { Observable, from } from "rxjs";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.persons | TableType.households;

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getAllCache: Record<string, Observable<Partial<TYPE>[]>> = {};

  public getAllWithHouseholds(
    options?: getAllOptionsType,
    refresh: boolean = false,
  ) {
    const cacheKeyJSON = {
      query: "getAllWithHouseholds",
      ...options,
    };
    const cacheKey = JSON.stringify(cacheKeyJSON);
    if (refresh || !this.getAllCache[cacheKey]) {
      this.getAllCache[cacheKey] = from(
        this.api.persons.getAllWithHouseholds.query(options),
      );
    }
    return this.getAllCache[cacheKey];
  }

  public getOneById(id: number) {
    return from(this.api.persons.getOneById.query(id));
  }
}
