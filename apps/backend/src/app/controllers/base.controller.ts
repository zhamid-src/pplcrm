import { getAllOptionsType } from '@common';
import {
  GetOperandType,
  Keys,
  Models,
  OperationDataType,
  TableColumnsType,
  TableIdType,
  TablesOperationMap,
} from '../../../../../common/src/lib/kysely.models';
import { BaseRepository, QueryParams } from '../repositories/base.repository';

/**
 * Base class for all controllers that provides basic CRUD operations. There is a controller for each
 * "concept", eg: persons, households, tags, profiles, etc.  Each controller is responsible for a single
 * table or a set of tables.  The controller is responsible for validating the input and output of the
 * repository.  It also provides a common interface for all controllers.
 *
 * It makes adding new controllers easier for each table.
 *
 * @example
 *
 * export class HouseholdsController extends BaseController<'households', HouseholdRepository> {
 *   constructor() {
 *     super(new HouseholdRepository());
 *   }
 * }
 *
 * This enables CRUD operations for the households table.
 */
export class BaseController<T extends keyof Models, R extends BaseRepository<T>> {
  constructor(private repo: R) {}

  /**
   * Add a row to the table.
   *
   * @param row - Row to add. It should only contain columns that are
   *              part of the table (or tables) supported by the controller
   *
   * @returns The inserted row
   */
  public add(row: OperationDataType<T, 'insert'>) {
    return this.repo.add(row);
  }

  /**
   * Add many rows to the table.
   *
   * @param rows - Rows to add. It should only contain columns that are
   *              part of the table (or tables) supported by the controller
   *
   * @returns The inserted rows
   */
  public addMany(rows: OperationDataType<T, 'insert'>[]) {
    return this.repo.addMany(rows);
  }

  /**
   * Delete the row with the given id.
   */
  public delete(id: bigint) {
    return this.repo.delete(
      id as GetOperandType<T, 'select', Keys<TablesOperationMap[T]['select']>>,
    );
  }

  /**
   * Given the key, return the first three rows that best match it
   * It's used for autocomplete.
   *
   * @param key - the key to match
   * @param column - the column to search
   * @param lhs - the left hand side of the match
   * @param tenant_id - the tenant ID to limit the search to
   *
   * @returns - upto three rows that best match the key
   */
  public async find(key: string, column: TableColumnsType<T>, tenant_id: bigint) {
    return await this.repo.find(key, column, tenant_id);
  }

  /**
   * Find all rows given the options.
   *
   * @see {@link getAllOptionsType} for more information about the options.
   */
  public getAll(options?: getAllOptionsType) {
    return this.repo.getAll(options as QueryParams<T>);
  }

  /**
   * Find the row with the given id.
   */
  public getById(id: bigint) {
    return this.repo.getById(id as TableIdType<T>);
  }

  /**
   * Get the number of rows in the table.
   * @returns The number of rows in the table
   *
   */
  public getCount() {
    return this.repo.count();
  }

  /**
   * Update the row with the given id, overriding columns with the given values.
   */
  public update(id: bigint, input: OperationDataType<T, 'update'>) {
    return this.repo.update(
      id as GetOperandType<T, 'update', Keys<TablesOperationMap[T]['update']>>,
      input,
    );
  }

  /**
   * @returns The operator used by the controller
   */
  protected getRepository() {
    return this.repo;
  }
}
