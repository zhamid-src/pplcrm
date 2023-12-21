import { Injectable } from "@angular/core";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class UserService extends TRPCService {
  // #region Public Methods (2)

  public getAll() {
    return this.api.users.getAll.query();
  }

  public getOneById(id: number) {
    return this.api.users.getOneById.query(id);
  }
}
