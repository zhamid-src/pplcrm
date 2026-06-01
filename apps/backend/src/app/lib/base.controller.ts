import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload, getAllOptionsType } from '@common';

import { ReferenceExpression, Transaction } from 'kysely';

import {
  Models,
  OperationDataType,
  TypeTenantId,
} from 'common/src/lib/kysely.models';
import { BaseRepository, QueryParams } from './base.repo';
import { rowsToCsv } from './csv';
import { UserActivityRepo } from './user-activity.repo';
import { TransactionalEmailService } from './mail/transactional-mail.service';

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
  protected readonly userActivity = new UserActivityRepo();

  constructor(private repo: R) {}

  /**
   * Inserts a single row into the table.
   *
   * @param row - The data to insert
   * @param trx - Optional Kysely transaction context
   * @returns A Promise resolving to the inserted row
   */
  public async add(row: OperationDataType<T, 'insert'>, trx?: Transaction<Models>) {
    const result = await this.repo.add({ row }, trx);
    try {
      const rowObj = row as Record<string, unknown>;
      const actor = rowObj['createdby_id'];
      const tenant = rowObj['tenant_id'];
      if (actor != null && tenant != null) {
        const resultObj = result as Record<string, unknown> | undefined;
        const resultId = resultObj && 'id' in resultObj ? String(resultObj['id']) : null;
        const metadata: Record<string, any> = resultId ? { id: resultId } : {};
        if (String(this.repo.getTableName()) === 'tasks' && resultObj && resultObj['name']) {
          metadata['task_name'] = String(resultObj['name']);
        }
        await this.userActivity.log({
          tenant_id: String(tenant),
          user_id: String(actor),
          activity: 'create',
          entity: String(this.repo.getTableName()),
          entity_id: resultId,
          quantity: 1,
          metadata,
        }, trx);
      }
    } catch (e) {
      console.error('Failed to log create activity', e);
    }
    return result;
  }

  /**
   * Inserts multiple rows into the table.
   *
   * @param rows - The data array to insert
   * @param trx - Optional Kysely transaction context
   * @returns A Promise resolving to the inserted rows
   */
  public async addMany(rows: OperationDataType<T, 'insert'>[], trx?: Transaction<Models>) {
    const result = await this.repo.addMany({ rows }, trx);
    try {
      const firstRow = rows[0];
      if (firstRow) {
        const rowObj = firstRow as Record<string, unknown>;
        const actor = rowObj['createdby_id'];
        const tenant = rowObj['tenant_id'];
        if (actor != null && tenant != null) {
          await this.userActivity.log({
            tenant_id: String(tenant),
            user_id: String(actor),
            activity: 'create',
            entity: String(this.repo.getTableName()),
            quantity: rows.length,
            metadata: { count: rows.length },
          }, trx);
        }
      }
    } catch (e) {
      console.error('Failed to log addMany activity', e);
    }
    return result;
  }

  /**
   * Deletes a single row by ID for a given tenant.
   *
   * @param tenant_id - The tenant's ID
   * @param idToDelete - The row's ID
   * @returns A Promise resolving to the deleted row (if any)
   */
  public async delete(tenant_id: TypeTenantId<T>, idToDelete: string, userId?: string) {
    const result = await this.repo.delete({
      tenant_id,
      id: idToDelete,
    });
    try {
      if (userId != null) {
        await this.userActivity.log({
          tenant_id: String(tenant_id),
          user_id: String(userId),
          activity: 'delete',
          entity: String(this.repo.getTableName()),
          entity_id: idToDelete ? String(idToDelete) : null,
          quantity: 1,
          metadata: { id: idToDelete },
        });
      }
    } catch (e) {
      console.error('Failed to log delete activity', e);
    }
    return result;
  }

  /**
   * Deletes multiple rows by ID for a given tenant.
   *
   * @param tenant_id - The tenant's ID
   * @param idsToDelete - Array of row IDs to delete
   * @returns A Promise resolving to the deleted rows (if any)
   */
  public deleteMany(tenant_id: TypeTenantId<T>, idsToDelete: string[]) {
    return this.repo.deleteMany({
      ids: idsToDelete,
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
    return this.repo.find({
      tenant_id: input.tenant_id,
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
    return this.repo.getAll({
      tenant_id: tenant,
      options: options as QueryParams<T>,
    });
  }

  public getAllWithCounts(tenant: string, options?: getAllOptionsType) {
    return this.getRepo().getAllWithCounts({
      tenant_id: tenant,
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
    return this.repo.count(tenant_id);
  }

  /**
   * Finds a single row by ID for a given tenant.
   *
   * @param input.tenant_id - Tenant ID
   * @param input.id - Row ID
   * @returns A Promise resolving to the found row or `undefined`
   */
  public getOneById(input: { tenant_id: string; id: string }) {
    return this.repo.getOneBy('id' as any, { value: input.id as any, tenant_id: input.tenant_id });
  }

  /**
   * Updates a row by ID for a given tenant.
   *
   * @param input.tenant_id - Tenant ID
   * @param input.id - Row ID
   * @param input.row - Partial data to update
   * @returns A Promise resolving to the updated row
   */
  public async update(input: { tenant_id: string; id: string; row: OperationDataType<T, 'update'> }) {
    const result = await this.repo.update({ id: input.id, tenant_id: input.tenant_id, row: input.row });
    try {
      const rowObj = input.row as Record<string, unknown>;
      const actor = rowObj['updatedby_id'];
      if (actor != null) {
        const metadata: Record<string, any> = { id: input.id };
        const resultObj = result as Record<string, unknown> | undefined;
        if (String(this.repo.getTableName()) === 'tasks' && resultObj && resultObj['name']) {
          metadata['task_name'] = String(resultObj['name']);
        }
        let activity = 'update';
        if (String(this.repo.getTableName()) === 'tasks' && 'due_at' in rowObj) {
          metadata['action'] = 'change_due_date';
          metadata['due_at'] = rowObj['due_at'];
        }
        if (String(this.repo.getTableName()) === 'tasks' && 'assigned_to' in rowObj) {
          const assigneeId = rowObj['assigned_to'];
          if (assigneeId == null || assigneeId === '') {
            activity = 'unassign';
          } else {
            activity = 'assign';
            try {
              const assignee = await this.repo.db.selectFrom('authusers')
                .select(['first_name', 'last_name'])
                .where('id', '=', Number(assigneeId) as any)
                .executeTakeFirst();
              if (assignee) {
                metadata['assigned_to_name'] = `${assignee.first_name} ${assignee.last_name || ''}`.trim();
              }
            } catch (err) {
              console.error('Failed to look up assignee name', err);
            }
          }
        }
        await this.userActivity.log({
          tenant_id: String(input.tenant_id),
          user_id: String(actor),
          activity: activity as any,
          entity: String(this.repo.getTableName()),
          entity_id: input.id ? String(input.id) : null,
          quantity: 1,
          metadata,
        });
      }
    } catch (e) {
      console.error('Failed to log update activity', e);
    }
    return result;
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

  public async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    const options = (input?.options ?? {}) as QueryParams<T>;
    const rows = await this.repo.getAll({ tenant_id: input.tenant_id, options });
    const records = rows.map((row) => ({ ...(row as Record<string, unknown>) }));
    const response = this.buildCsvResponse(records, input);

    if (auth) {
      try {
        await this.userActivity.log({
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          activity: 'export',
          entity: String(this.repo.getTableName()),
          quantity: response.rowCount,
          metadata: {
            requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
            returned_columns: response.columns.slice(0, 12),
            file_name: response.fileName,
          },
        });

        const user = await this.repo.db.selectFrom('authusers')
          .select(['email'])
          .where('id', '=', auth.user_id as any)
          .executeTakeFirst();
        if (user && user.email) {
          const mailService = new TransactionalEmailService();
          await mailService.sendMail({
            to: user.email,
            subject: `Your Export is Ready: ${response.fileName}`,
            text: `Hi ${auth.name},\n\nYour export of ${response.rowCount} records from the ${String(this.repo.getTableName())} table is ready.\n\nFile Name: ${response.fileName}\nDownload Link: http://localhost:4200/downloads/${response.fileName}`,
            html: `<p>Hi ${auth.name},</p><p>Your export of <strong>${response.rowCount}</strong> records from the <strong>${String(this.repo.getTableName())}</strong> table is ready.</p><p><strong>File Name:</strong> ${response.fileName}<br><strong>Download Link:</strong> <a href="http://localhost:4200/downloads/${response.fileName}">Download CSV</a></p>`,
          });
        }
      } catch (err) {
        // Logging failures should never break export flow; swallow silently
        console.error('Failed to log export activity or send email alert', err);
      }
    }

    return response;
  }

  protected buildCsvResponse(
    rows: Array<Record<string, unknown>>,
    input: ExportCsvInputType & { tenant_id: string },
  ): ExportCsvResponseType {
    const requestedColumns = Array.isArray(input?.columns)
      ? (input.columns.filter((c): c is string => Boolean(c)) ?? [])
      : [];
    const columns = requestedColumns.length
      ? requestedColumns
      : rows.length > 0
        ? Object.keys(rows[0] as Record<string, unknown>)
        : [];
    const fileName = input?.fileName?.trim() || `${String(this.repo.getTableName())}-export.csv`;
    const csv = columns.length ? rowsToCsv(rows as Array<Record<string, any>>, columns) : '';
    return {
      csv,
      columns,
      fileName,
      rowCount: rows.length,
    };
  }
}
