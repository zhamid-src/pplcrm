import { Injectable } from '@angular/core';
import { getAllOptionsType } from '@common';
import { Models } from 'common/src/lib/kysely.models';
import { TRPCService } from '../trpc.service';

/**
 * This is the base class that makes backend calls for all CRUD operations
 * for a given table or a set of tables. This is typically used by grids.
 *
 * T is the name of the table that this service is for (and that the grid is showing).
 * This should be a key of the Models type.
 *
 * U is the row should be of type that is a subset of the columns in the matching table (or tables)
 *
 * Example:
 * If the table is "persons"", and the table has columns id, name, age, then the AbstractBackendService
 * can be extended as AbstractBackendService<"persons", { name: string, age: number }>
 */
@Injectable({
  providedIn: 'root',
})
export abstract class AbstractBackendService<T extends keyof Models, U> extends TRPCService<T> {
  /**
   * Add all given rows to the database.
   *
   * @returns Return the newly added rows, or nothing if the add is not supported
   *
   * @param rows The rows to add to the grid
   */
  public abstract addMany(rows: U[]): Promise<Partial<T>[] | unknown>;
  /**
   * Delete the row with the given id from the database.
   *
   * @returns Return the newly deleted row or undefined if the row was not found
   * or if the delete is not supported
   *
   * @param id The id of the row to delete
   */
  public abstract delete(id: string): Promise<boolean>;
  /**
   * Return all rows from the database that matches the given options.
   * If no options are given then return all rows.
   *
   * @returns Return all rows from the database that matches the given options.
   * If the operation is not supported then it simply returns empty
   *
   * @see getAllOptions
   *
   * @param options
   */
  public abstract getAll(options?: getAllOptionsType): Promise<T[] | unknown>;
  /**
   * Return the first row that matches the given ID. Typically the ID is the primary key,
   * so this should match only one row.
   *
   * @returns Return the row that matches the given ID or undefined if the row was not found
   * or if the operation is not supported.
   *
   * @param id - The id of the row to find
   */
  public abstract getById(id: string): Promise<Record<never, never> | undefined>;
  public abstract getDistinctTags(): Promise<string[]>;
  public abstract getTags(id: string | string): Promise<string[]>;
  /**
   * Update the row with the given ID with the given data.
   *
   * @returns The row that was updated (the ID is typically the primary key so
   * only one row should be updated, but it returns an array of rows).
   *
   * @param id The row to update
   * @param data The data to update the row with
   */
  public abstract update(id: string, data: U): Promise<Partial<T>[] | unknown>;
}
