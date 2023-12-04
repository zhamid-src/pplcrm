import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { TRPCService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class TodoService extends TRPCService {
  public getAllTodos() {
    return from(this.api.users.getAll.query());
  }

  public getById(id: number) {
    return from(this.api.users.getById.query(id));
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
