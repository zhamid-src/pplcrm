import { Injectable } from "@angular/core";
import { getAllOptionsType } from "@common";
import { from } from "rxjs";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService {
  // #region Public Methods (2)

  public getAllWithHouseholds(options?: getAllOptionsType) {
    return from(this.api.persons.getAllWithHouseholds.query(options));
  }

  public getOneById(id: number) {
    return from(this.api.persons.getOneById.query(id));
  }
}
