import { Injectable } from "@angular/core";
import { TableType } from "common/src/lib/kysely.models";
import { BaseGridService } from "./base-grid.service";

export type TYPE = TableType.households;

@Injectable({
  providedIn: "root",
})
export class HouseholdsService extends BaseGridService<TYPE, never> {
  private getAllWithPeopleCount() {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
  }

  public refresh() {
    return this.getAllWithPeopleCount();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  public update(id: number, data: any) {
    // TODO implement
    return Promise.resolve([]);
  }
  public getOneById(id: number) {
    return this.api.households.getOneById.query(id);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public deleteMany(ids: number[]) {
    return Promise.resolve(true); // TODO: implement
    // return this.api.households.deleteMany.mutate(ids);
  }
}
