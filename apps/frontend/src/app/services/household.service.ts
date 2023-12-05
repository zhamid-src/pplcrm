import { Injectable } from "@angular/core";
import { from } from "rxjs";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class UserService extends TRPCService {
  public getAll() {
    return from(this.api.households.getAll.query());
  }

  public getOneById(id: number) {
    return from(this.api.households.getOneById.query(id));
  }

  /*
  public addTodo(todo: ITodoBody): Observable<ITodo> {
    return from(this.api.todo.add.mutate(todo));
  }

  public updateTodo(todo: ITodo): Observable<ITodo> {
    return from(this.api.todo.update.mutate(todo));
  }
  */
}
