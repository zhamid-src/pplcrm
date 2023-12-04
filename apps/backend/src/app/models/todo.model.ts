export interface ITodoBody {
  todo: string;
  done: boolean;
}

export interface ITodo extends Partial<ITodoBody> {
  id: number;
}
