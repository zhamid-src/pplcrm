import { Injectable } from '@angular/core';
import { ExportCsvInputType, ExportCsvResponseType, getAllOptionsType } from '@common';
import { TRPCService } from './trpc-service';

import { Models } from 'common/src/lib/kysely.models';

/**
 * Abstract base class for API services that handle CRUD operations for database tables.
 *
 * This service provides a standardized interface for all backend operations including
 * create, read, update, delete, and tag management. It extends TRPCService to leverage
 * type-safe RPC communication with the backend.
 *
 * The service is designed to work with data grids and other components that need
 * consistent data access patterns across different entity types.
 *
 * @template T - The database table name (must be a key of the Models type)
 * @template U - The row data type (subset of table columns used for operations)
 *
 * @example
 * ```typescript
 * // For a "persons" table with columns: id, name, age, email
 * class PersonsService extends AbstractAPIService<"persons", { name: string, age: number }> {
 *   // Implement abstract methods...
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Usage in a component
 * constructor(private personsService: PersonsService) {}
 *
 * async loadPersons() {
 *   const result = await this.personsService.getAll({ limit: 10, offset: 0 });
 *   return result.rows;
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export abstract class AbstractAPIService<T extends keyof Models, U> extends TRPCService<T> {
  /**
   * Adds a single row to the database.
   *
   * @param row - The row data to add to the database
   * @returns Promise resolving to the newly created row or unknown if operation fails
   */
  public abstract add(row: U): Promise<Partial<T> | unknown>;

  /**
   * Adds multiple rows to the database in a batch operation.
   *
   * This method is more efficient than calling add() multiple times as it
   * performs the operation in a single database transaction.
   *
   * @param rows - Array of row data to add to the database
   * @returns Promise resolving to the newly created rows or unknown if operation fails
   */
  public abstract addMany(rows: U[]): Promise<Partial<T>[] | unknown>;

  /**
   * Attaches a tag to a specific record.
   *
   * @param id - The unique identifier of the record
   * @param tag_name - The name of the tag to attach
   * @returns Promise resolving when the tag is successfully attached
   */
  public abstract attachTag(id: string, tag_name: string): Promise<unknown>;

  /**
   * Returns the total count of records in the table.
   *
   * @returns Promise resolving to the total number of records
   */
  public abstract count(): Promise<number>;

  /**
   * Deletes a single record from the database.
   *
   * @param id - The unique identifier of the record to delete
   * @returns Promise resolving to true if deletion was successful, false otherwise
   */
  public abstract delete(id: string): Promise<boolean>;

  /**
   * Deletes multiple records from the database in a batch operation.
   *
   * @param ids - Array of unique identifiers of records to delete
   * @returns Promise resolving to true if all deletions were successful, false otherwise
   */
  public abstract deleteMany(ids: string[]): Promise<boolean>;

  /**
   * Detaches a tag from a specific record.
   *
   * @param id - The unique identifier of the record
   * @param tag_name - The name of the tag to detach
   * @returns Promise resolving to true if detachment was successful, never if operation fails
   */
  public abstract detachTag(id: string, tag_name: string): Promise<never | boolean>;

  /**
   * Retrieves all records from the database with optional filtering and pagination.
   *
   * This method supports various query options including filtering, sorting,
   * pagination, and field selection. If no options are provided, returns all records.
   *
   * @param options - Optional query parameters for filtering, sorting, and pagination
   * @param options.limit - Maximum number of records to return
   * @param options.offset - Number of records to skip (for pagination)
   * @param options.orderBy - Field to sort by
   * @param options.orderDirection - Sort direction ('asc' or 'desc')
   * @param options.filters - Object containing filter criteria
   * @returns Promise resolving to an object containing rows array and total count
   *
   * @example
   * ```typescript
   * const result = await service.getAll({
   *   limit: 10,
   *   offset: 0,
   *   orderBy: 'name',
   *   filters: { active: true }
   * });
   * console.log(`Found ${result.count} total records, showing ${result.rows.length}`);
   * ```
   */
  public abstract getAll(options?: getAllOptionsType): Promise<{ rows: { [x: string]: any }[]; count: number }>;

  public abstract getAllArchived(options?: getAllOptionsType): Promise<{ rows: { [x: string]: any }[]; count: number }>;

  /**
   * Retrieves a single record by its unique identifier.
   *
   * Typically the ID corresponds to the primary key, ensuring only one record
   * is returned. This method is commonly used for detail views and edit forms.
   *
   * @param id - The unique identifier of the record to retrieve
   * @returns Promise resolving to the record data or undefined if not found
   *
   * @example
   * ```typescript
   * const person = await service.getById('123');
   * if (person) {
   *   console.log('Found person:', person.name);
   * } else {
   *   console.log('Person not found');
   * }
   * ```
   */
  public abstract getById(id: string): Promise<Record<never, never> | undefined>;

  /**
   * Retrieves all tags associated with a specific record.
   *
   * @param id - The unique identifier of the record
   * @returns Promise resolving to an array of tag names
   *
   * @example
   * ```typescript
   * const tags = await service.getTags('123');
   * console.log('Record tags:', tags.join(', '));
   * ```
   */
  public abstract getTags(id: string): Promise<string[]>;

  /**
   * Updates an existing record with new data.
   *
   * The update operation is performed using the record's unique identifier.
   * Only the fields provided in the data parameter will be updated.
   *
   * @param id - The unique identifier of the record to update
   * @param data - The new data to update the record with (partial update supported)
   * @returns Promise resolving to the updated record(s) or unknown if operation fails
   *
   * @example
   * ```typescript
   * const updated = await service.update('123', {
   *   name: 'New Name',
   *   email: 'new@example.com'
   * });
   * console.log('Updated record:', updated);
   * ```
   */
  public abstract update(id: string, data: U): Promise<Partial<T>[] | unknown>;

  public abstract exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType>;
}
