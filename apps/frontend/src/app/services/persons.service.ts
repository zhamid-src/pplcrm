import { Injectable } from "@angular/core";
import { from } from "rxjs";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export class PersonsService extends TRPCService {
  // #region Public Methods (2)

  public getAll() {
    return from(this.api.persons.getAll.query());
  }

  public getOneById(id: number) {
    return from(this.api.persons.getOneById.query(id));
  }

  // #endregion Public Methods (2)
  /*
  public addTodo(todo: ITodoBody): Observable<ITodo> {
    return from(this.api.todo.add.mutate(todo));
  }

  public updateTodo(todo: ITodo): Observable<ITodo> {
    return from(this.api.todo.update.mutate(todo));
  }
  */
}
