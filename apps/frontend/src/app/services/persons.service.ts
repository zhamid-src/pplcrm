import { Injectable } from "@angular/core";
import { UpdatePersonsType, getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { TRPCService } from "./trpc.service";

export type TYPE = TableType.persons | TableType.households;

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService<TYPE> {
  public getAllWithHouseholds(
    options?: getAllOptionsType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refresh: boolean = false,
  ) {
    return this.api.persons.getAllWithHouseholds.query(options, {
      signal: this.ac.signal,
    });
    /*
    return this.runCachedCall(
      this.api.persons.getAllWithHouseholds.query(options, {
        signal: this.ac.signal,
      }),
      "persons.getAllWithHouseholds",
      options,
      refresh,
    );
    */
  }

  public getOneById(id: number) {
    // No need to run the cached call for getting just one
    return this.api.persons.getOneById.query(id);
  }

  public update(id: number, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id, data });
  }

  public delete(id: number) {
    return this.api.persons.delete.mutate(id);
  }

  public deleteMany(ids: number[]) {
    return this.api.persons.deleteMany.mutate(ids);
  }
}
