import { Injectable } from "@angular/core";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class UserService extends TRPCService {
  public getAll() {
    return this.api.households.getAll.query(undefined, {
      signal: this.ac.signal,
    });
  }

  public getOneById(id: number) {
    return this.api.households.getOneById.query(id);
  }
}
