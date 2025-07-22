import { getAllOptionsType } from "@common";
import {
  OperandValueExpressionOrList,
  ReferenceExpression,
  Transaction,
} from "kysely";
import {
  Models,
  OperationDataType,
  TypeColumn,
  TypeId,
  TypeTenantId,
} from "../../../../../common/src/lib/kysely.models";
import { BaseRepository, QueryParams } from "../repositories/base.repo";

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
export class BaseController<
  T extends keyof Models,
  R extends BaseRepository<T>,
> {
  constructor(private repo: R) {}

  /**
   * Add a row to the table.
   *
   * @param row - Row to add. It should only contain columns that are
   *              part of the table (or tables) supported by the controller
   *
   * @returns The inserted row
   */
  public add(row: OperationDataType<T, "insert">, trx?: Transaction<Models>) {
    return this.repo.add({ row }, trx);
  }

  /**
   * Add many rows to the table.
   *
   * @param rows - Rows to add. It should only contain columns that are
   *              part of the table (or tables) supported by the controller
   *
   * @returns The inserted rows
   */
  public addMany(
    rows: OperationDataType<T, "insert">[],
    trx?: Transaction<Models>,
  ) {
    return this.repo.addMany({ rows }, trx);
  }

  /**
   * Delete the row with the given id.
   */
  public delete(tenant_id: TypeTenantId<T>, idToDelete: string) {
    return this.repo.delete({
      tenant_id: tenant_id,
      id: idToDelete as TypeId<T>,
    });
  }

  /**
   * Delete the rows with the given ids.
   */
  public deleteMany(
    tenant_id: TypeColumn<T, "tenant_id">,
    idsToDelete: string[],
  ) {
    return this.repo.deleteMany({ ids: idsToDelete as TypeId<T>, tenant_id });
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
  public async find(input: {
    tenant_id: string;
    key: string;
    column: ReferenceExpression<Models, T>;
  }) {
    const tenant_id = input.tenant_id as OperandValueExpressionOrList<
      Models,
      T,
      "tenant_id"
    >;
    return await this.repo.find({
      tenant_id,
      key: input.key,
      column: input.column,
    });
  }

  /**
   * Find all rows given the options.
   *
   * @see {@link getAllOptionsType} for more information about the options.
   */
  public getAll(tenant: string, options?: getAllOptionsType) {
    const tenant_id = tenant as OperandValueExpressionOrList<
      Models,
      T,
      "tenant_id"
    >;
    return this.repo.getAll({ tenant_id, options: options as QueryParams<T> });
  }

  /**
   * Find the row with the given id.
   */
  public getById(input: { tenant_id: string; id: string }) {
    const tenant_id = input.tenant_id as OperandValueExpressionOrList<
      Models,
      T,
      "tenant_id"
    >;
    const id = input.id as OperandValueExpressionOrList<Models, T, "id">;

    return this.repo.getById({ id, tenant_id });
  }

  /**
   * Get the number of rows in the table.
   * @returns The number of rows in the table
   *
   */
  public getCount(tenant_id: string) {
    return this.repo.count(
      tenant_id as OperandValueExpressionOrList<Models, T, "tenant_id">,
    );
  }

  /**
   * Update the row with the given id, overriding columns with the given values.
   */
  public update(input: {
    tenant_id: string;
    id: string;
    row: OperationDataType<T, "update">;
  }) {
    const id = input.id as TypeId<T>;
    const tenant_id = input.tenant_id as TypeTenantId<T>;
    return this.repo.update({ id, tenant_id, row: input.row });
  }

  /**
   * @returns The operator used by the controller
   */
  protected getRepo() {
    return this.repo;
  }
}
