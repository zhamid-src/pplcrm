import { Injectable } from "@angular/core";
import { getAllOptionsType } from "@common";
import { TRPCService } from "./trpc.service";

@Injectable({
  providedIn: "root",
})
export abstract class BaseGridService<T, U> extends TRPCService<T> {
  abstract refresh(options?: getAllOptionsType): Promise<T | unknown>;
  abstract deleteMany(ids: number[]): Promise<boolean>;
  abstract update(id: number, data: U): Promise<Partial<T>[] | unknown>;
  abstract getOneById(id: number): Promise<Record<never, never> | undefined>;
}
