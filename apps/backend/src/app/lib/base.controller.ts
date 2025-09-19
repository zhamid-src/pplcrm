import { getAllOptionsType } from '@common';

import { OperandValueExpressionOrList, ReferenceExpression, Transaction } from 'kysely';

import {
  Models,
  OperationDataType,
  TypeColumn,
  TypeId,
  TypeTenantId,
} from '../../../../../common/src/lib/kysely.models';
import { BaseRepository, QueryParams } from './base.repo';

/**
 * Abstract base controller for all domain entities (e.g. persons, households, tags).
 *
 * Provides generic, reusable CRUD operations by delegating to the appropriate
 * `BaseRepository<T>`. Each subclass is tied to a single database table (or set of tables).
 *
 * Controllers should be used for validating input/output and providing a stable
 * interface to route handlers or tRPC procedures.
 *
 * @typeParam T - The table name, as a key of `Models`
 * @typeParam R - The repository type, extending `BaseRepository<T>`
 *
 * @example
 * ```ts
 * export class HouseholdsController extends BaseController<'households', HouseholdRepository> {
 *   constructor() {
 *     super(new HouseholdRepository());
 *   }
 * }
 * ```
 */
export class BaseController<T extends keyof Models, R extends BaseRepository<T>> {
  constructor(private repo: R) {}

  /**
   * Inserts a single row into the table.
   *
   * @param row - The data to insert
   * @param trx - Optional Kysely transaction context
   * @returns A Promise resolving to the inserted row
   */
  public add(row: OperationDataType<T, 'insert'>, trx?: Transaction<Models>) {
    return this.repo.add({ row }, trx);
  }

  /**
   * Inserts multiple rows into the table.
   *
   * @param rows - The data array to insert
   * @param trx - Optional Kysely transaction context
   * @returns A Promise resolving to the inserted rows
   */
  public addMany(rows: OperationDataType<T, 'insert'>[], trx?: Transaction<Models>) {
    return this.repo.addMany({ rows }, trx);
  }

  /**
   * Deletes a single row by ID for a given tenant.
   *
   * @param tenant_id - The tenant's ID
   * @param idToDelete - The row's ID
   * @returns A Promise resolving to the deleted row (if any)
   */
  public delete(tenant_id: TypeTenantId<T>, idToDelete: string) {
    return this.repo.delete({
      tenant_id,
      id: idToDelete as TypeId<T>,
    });
  }

  /**
   * Deletes multiple rows by ID for a given tenant.
   *
   * @param tenant_id - The tenant's ID
   * @param idsToDelete - Array of row IDs to delete
   * @returns A Promise resolving to the deleted rows (if any)
   */
  public deleteMany(tenant_id: TypeColumn<T, 'tenant_id'>, idsToDelete: string[]) {
    return this.repo.deleteMany({
      ids: idsToDelete as TypeId<T>[],
      tenant_id,
    });
  }

  /**
   * Returns the top 3 rows matching the key in the specified column.
   * Typically used for autocomplete / search-as-you-type.
   *
   * @param input.tenant_id - Tenant ID to filter within
   * @param input.key - Partial match key
   * @param input.column - Column to match against (e.g. 'name')
   * @returns A Promise resolving to up to 3 best-matching rows
   */
  public find(input: { tenant_id: string; key: string; column: ReferenceExpression<Models, T> }) {
    const tenant_id = input.tenant_id as OperandValueExpressionOrList<Models, T, 'tenant_id'>;
    return this.repo.find({
      tenant_id,
      key: input.key,
      column: input.column,
    });
  }

  /**
   * Returns all rows for a tenant, optionally filtered by query options.
   *
   * @param tenant - Tenant ID to filter by
   * @param options - Optional filters, sorting, pagination
   * @returns A Promise resolving to all matching rows
   */
  public getAll(tenant: string, options?: getAllOptionsType) {
    const tenant_id = tenant as OperandValueExpressionOrList<Models, T, 'tenant_id'>;
    return this.repo.getAll({
      tenant_id,
      options: options as QueryParams<T>,
    });
  }

  public getAllWithCounts(tenant: string, options?: getAllOptionsType) {
    const tenant_id = tenant as OperandValueExpressionOrList<Models, T, 'tenant_id'>;
    return this.getRepo().getAllWithCounts({
      tenant_id,
      options: options as QueryParams<any>,
    });
  }

  /**
   * Counts the number of rows for a given tenant.
   *
   * @param tenant_id - Tenant ID to filter by
   * @returns A Promise resolving to the total row count
   */
  public getCount(tenant_id: string) {
    return this.repo.count(tenant_id as OperandValueExpressionOrList<Models, T, 'tenant_id'>);
  }

  /**
   * Finds a single row by ID for a given tenant.
   *
   * @param input.tenant_id - Tenant ID
   * @param input.id - Row ID
   * @returns A Promise resolving to the found row or `undefined`
   */
  public getOneById(input: { tenant_id: string; id: string }) {
    const tenant_id = input.tenant_id as OperandValueExpressionOrList<Models, T, 'tenant_id'>;
    const id = input.id as OperandValueExpressionOrList<Models, T, 'id'>;

    return this.repo.getOneBy('id', { value: id, tenant_id });
  }

  /**
   * Updates a row by ID for a given tenant.
   *
   * @param input.tenant_id - Tenant ID
   * @param input.id - Row ID
   * @param input.row - Partial data to update
   * @returns A Promise resolving to the updated row
   */
  public update(input: { tenant_id: string; id: string; row: OperationDataType<T, 'update'> }) {
    const id = input.id as TypeId<T>;
    const tenant_id = input.tenant_id as TypeTenantId<T>;
    return this.repo.update({ id, tenant_id, row: input.row });
  }

  /**
   * Protected access to the underlying repository.
   * Useful for controller extensions and internal operations.
   *
   * @returns The repository instance
   */
  protected getRepo() {
    return this.repo;
  }
}
