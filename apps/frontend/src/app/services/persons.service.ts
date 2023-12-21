import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { from } from "rxjs";
import { CacheService } from "./cache.service";
import { TokenService } from "./token.service";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.persons | TableType.households;

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService {
  constructor(
    private cache: CacheService<TYPE>,
    protected override tokenService: TokenService,
    protected override routerService: Router,
  ) {
    super(tokenService, routerService);
  }

  public getAllWithHouseholds(
    options?: getAllOptionsType,
    refresh: boolean = false,
  ) {
    const cacheKey = JSON.stringify({
      query: "getAllWithHouseholds",
      ...options,
    });

    if (refresh || !this.cache.has(cacheKey)) {
      this.cache.set(
        cacheKey,
        from(this.api.persons.getAllWithHouseholds.query(options)),
      );
    }
    return this.cache.get(cacheKey);
  }

  public getOneById(id: number) {
    return from(this.api.persons.getOneById.query(id));
  }
}
