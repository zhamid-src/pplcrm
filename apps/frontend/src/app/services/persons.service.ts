import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { CachedTRPCService } from "./cached-trpc.service";
import { TokenService } from "./token.service";

export type TYPE = TableType.persons | TableType.households;

@Injectable({
  providedIn: "root",
})
export class PersonsService extends CachedTRPCService<TYPE> {
  constructor(
    protected override tokenService: TokenService,
    protected override routerService: Router,
  ) {
    super(tokenService, routerService);
  }

  public getAllWithHouseholds(
    options?: getAllOptionsType,
    refresh: boolean = false,
  ) {
    return this.runCachedCall(
      this.api.persons.getAllWithHouseholds.query(options, {
        signal: this.ac.signal,
      }),
      "getAllWithHouseholds",
      options,
      refresh,
    );
  }

  public getOneById(id: number) {
    // No need to run the cached call for getting just one
    return this.api.persons.getOneById.query(id);
  }
}
