import { Injectable } from "@angular/core";
import { TableType } from "common/src/lib/kysely.models";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class UserService extends TRPCService<TableType.profiles> {
  // #region Public Methods (2)

  public getAll() {
    return this.api.users.getAll.query();
  }

  public getOneById(id: number) {
    return this.api.users.getOneById.query(id);
  }
}
