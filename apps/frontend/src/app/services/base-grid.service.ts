import { Injectable } from '@angular/core';
import { getAllOptionsType } from '@common';
import { TRPCService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export abstract class BaseGridService<T, U> extends TRPCService<T> {
  public abstract addMany(rows: U[]): Promise<Partial<T>[] | unknown>;
  public abstract delete(id: number): Promise<boolean>;
  public abstract findOne(id: number): Promise<Record<never, never> | undefined>;
  public abstract refresh(options?: getAllOptionsType): Promise<T | unknown>;
  public abstract update(id: number, data: U): Promise<Partial<T>[] | unknown>;
}
