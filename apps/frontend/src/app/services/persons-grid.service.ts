import { Injectable } from "@angular/core";
import { UpdatePersonsType, getAllOptionsType } from "@common";
import { TableType } from "common/src/lib/kysely.models";
import { BaseGridService } from "./base-grid.service";

export type TYPE = TableType.persons | TableType.households;

@Injectable({
  providedIn: "root",
})
export class PersonsGridService extends BaseGridService<
  TYPE,
  UpdatePersonsType
> {
  private getAllWithHouseholds(options?: getAllOptionsType) {
    return this.api.persons.getAllWithHouseholds.query(options, {
      signal: this.ac.signal,
    });
  }

  public refresh(options?: getAllOptionsType) {
    return this.getAllWithHouseholds(options);
  }
  public async update(id: number, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id, data });
  }

  public getOneById(id: number) {
    return this.api.persons.getOneById.query(id);
  }

  public deleteMany(ids: number[]): Promise<boolean> {
    return this.api.persons.deleteMany
      .mutate(ids)
      .then(() => true)
      .catch(() => false);
  }
}
