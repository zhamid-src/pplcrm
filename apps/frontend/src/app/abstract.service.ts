import { Injectable } from '@angular/core';
import { getAllOptionsType } from '@common';
import { TRPCService } from 'apps/frontend/src/app/data/trpc-service';
import { Models } from 'common/src/lib/kysely.models';

/**
 * This abstract service provides a base layer for performing CRUD operations
 * on a specific table (or related set of tables) via TRPC. It is designed to be
 * extended by concrete services like `PersonsService` or `HouseholdsService`.
 *
 * @typeParam T - The table name (must be a key of `Models`)
 * @typeParam U - The shape of data used for updating/creating rows, typically a partial or full row
 *                structure derived from the columns of table `T`
 *
 * @example
 * ```ts
 * export class PersonsService extends AbstractAPIService<'persons', { name: string; age: number }> {
 *   ...
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export abstract class AbstractAPIService<T extends keyof Models, U> extends TRPCService<T> {
  /**
   * Add a single row to the database.
   * @param row - The row data to insert
   * @returns The inserted row or result
   */
  public abstract add(row: U): Promise<Partial<T> | unknown>;

  /**
   * Add multiple rows to the database.
   * @param rows - Array of row data to insert
   * @returns The inserted rows or a placeholder if unsupported
   */
  public abstract addMany(rows: U[]): Promise<Partial<T>[] | unknown>;

  /**
   * Attach a tag to a row by ID.
   * @param id - Row ID
   * @param tag_name - Name of the tag to attach
   */
  public abstract attachTag(id: string, tag_name: string): Promise<never | void>;

  /**
   * Delete a single row from the database.
   * @param id - Row ID
   * @returns True if deletion was successful, false otherwise
   */
  public abstract delete(id: string): Promise<boolean>;

  /**
   * Delete multiple rows from the database.
   * @param ids - Array of row IDs to delete
   * @returns True if deletions were successful
   */
  public abstract deleteMany(ids: string[]): Promise<boolean>;

  /**
   * Fetch all rows that match the provided options.
   * @param options - Filtering or pagination options
   * @returns All matching rows or empty result if unsupported
   */
  public abstract getAll(options?: getAllOptionsType): Promise<T[] | unknown>;

  /**
   * Fetch a single row by its ID.
   * @param id - Row ID
   * @returns The matching row or undefined if not found
   */
  public abstract getById(id: string): Promise<Record<never, never> | undefined>;

  /**
   * Get tags attached to a given row.
   * @param id - Row ID
   * @returns An array of tag names
   */
  public abstract getTags(id: string): Promise<string[]>;

  /**
   * Detach a tag from a row by ID.
   * @param id - Row ID
   * @param tag_name - Tag name to remove
   * @returns Boolean indicating success, or `never` if unsupported
   */
  public abstract detachTag(id: string, tag_name: string): Promise<never | boolean>;

  /**
   * Update a row with the specified data.
   * @param id - Row ID to update
   * @param data - Partial data to apply
   * @returns The updated row(s) or result
   */
  public abstract update(id: string, data: U): Promise<Partial<T>[] | unknown>;
}
