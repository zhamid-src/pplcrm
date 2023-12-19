import { Injectable } from "@angular/core";
import { from } from "rxjs";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService {
  // #region Public Methods (2)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getAllWithHouseholds(options?: any) {
    return from(this.api.persons.getAllWithHouseholds.query(options));
  }

  public getOneById(id: number) {
    return from(this.api.persons.getOneById.query(id));
  }
}
