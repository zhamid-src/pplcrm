/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AddListType,
  IAuthKeyPayload,
  UpdateListType,
  getAllOptionsType,
} from '../../../../../../libs/common/src';
import { TRPCError } from '@trpc/server';

import { BaseController } from '../../lib/base.controller';
import { HouseholdsController } from '../households/controller';
import { PersonsController } from '../persons/controller';
import { ListsRepo } from './repositories/lists.repo';
import { MapListsHouseholdsRepo } from './repositories/map-lists-households.repo';
import { MapListsPersonsRepo } from './repositories/map-lists-persons.repo';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { WorkflowsController } from '../workflows/controller';
import { logger } from '../../logger';

export class ListsController extends BaseController<'lists', ListsRepo> {
  private householdsController = new HouseholdsController();
  private mapListsHouseholdsRepo = new MapListsHouseholdsRepo();
  private mapListsPersonsRepo = new MapListsPersonsRepo();
  private personsController = new PersonsController();

  constructor() {
    super(new ListsRepo());
  }

  public async addList(payload: AddListType, auth: IAuthKeyPayload) {
    // Enforce unique list names per tenant
    const existing = await this.getRepo().getOneBy('name', {
      tenant_id: auth.tenant_id,
      value: payload.name,
    });
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'A list with this name already exists.' });

    const row = {
      name: payload.name,
      description: payload.description,
      object: payload.object,
      is_dynamic: payload.is_dynamic ?? false,
      definition: payload.definition ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      status: (payload.is_dynamic ?? false) ? 'refreshing' : 'idle',
    };

    const list = await this.add(row as OperationDataType<'lists', 'insert'>);

    // For dynamic lists, trigger an immediate initial refresh via background job
    if (row.is_dynamic) {
      await this.getRepo()
        .db.insertInto('background_jobs')
        .values({
          tenant_id: auth.tenant_id,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'refresh_list',
            list_id: list.id,
            tenant_id: auth.tenant_id,
            user_id: auth.user_id,
          }),
          run_at: new Date(),
        })
        .execute();
    } else {
      // For static lists, populate membership by explicit IDs if provided; otherwise by definition
      const ids = payload.member_ids ?? [];

      if (ids.length && payload.object === 'people') {
        const rows = ids.map((person_id) => ({
          tenant_id: auth.tenant_id,
          list_id: list.id,
          person_id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        }));
        await this.mapListsPersonsRepo.addMany({ rows: rows as OperationDataType<'map_lists_persons', 'insert'>[] });
        try {
          const workflowsController = new WorkflowsController();
          for (const person_id of ids) {
            await workflowsController.triggerWorkflow(auth.tenant_id, person_id, 'list_joined', list.id);
          }
        } catch (err) {
          logger.error({ err }, 'Failed to trigger list_joined workflow in addList (explicit IDs)');
        }
      } else if (ids.length && payload.object === 'households') {
        const rows = ids.map((household_id) => ({
          tenant_id: auth.tenant_id,
          list_id: list.id,
          household_id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        }));
        await this.mapListsHouseholdsRepo.addMany({
          rows: rows as OperationDataType<'map_lists_households', 'insert'>[],
        });
      } else if (payload.definition) {
        if (payload.object === 'people') {
          const result = await this.personsController.getAllWithAddress(auth, payload.definition as getAllOptionsType);
          const rows = result.rows.map((p) => ({
            tenant_id: auth.tenant_id,
            list_id: list.id,
            person_id: String(p['id']),
            createdby_id: auth.user_id,
            updatedby_id: auth.user_id,
          }));
          if (rows.length) {
            await this.mapListsPersonsRepo.addMany({
              rows: rows as OperationDataType<'map_lists_persons', 'insert'>[],
            });
            try {
              const workflowsController = new WorkflowsController();
              for (const r of rows) {
                await workflowsController.triggerWorkflow(auth.tenant_id, r.person_id, 'list_joined', list.id);
              }
            } catch (err) {
              logger.error({ err }, 'Failed to trigger list_joined workflow in addList (definition)');
            }
          }
        } else if (payload.object === 'households') {
          const result = await this.householdsController.getAllWithPeopleCount(
            auth,
            payload.definition as getAllOptionsType,
          );
          const rows = result.rows.map((h) => ({
            tenant_id: auth.tenant_id,
            list_id: list.id,
            household_id: h['id'],
            createdby_id: auth.user_id,
            updatedby_id: auth.user_id,
          }));
          if (rows.length) {
            await this.mapListsHouseholdsRepo.addMany({
              rows: rows as OperationDataType<'map_lists_households', 'insert'>[],
            });
          }
        }
      }
    }

    return list;
  }

  public async refreshList(auth: IAuthKeyPayload, id: string): Promise<any> {
    const list = (await super.getOneById({ tenant_id: auth.tenant_id, id })) as any;
    if (!list) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' });
    }
    if (!list.is_dynamic) {
      return list;
    }

    // Set list status to refreshing
    await this.update({
      tenant_id: auth.tenant_id,
      id,
      row: {
        status: 'refreshing',
        updatedby_id: auth.user_id,
        updated_at: new Date(),
      } as any,
    });

    // Queue background job
    await this.getRepo()
      .db.insertInto('background_jobs')
      .values({
        tenant_id: auth.tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'refresh_list',
          list_id: id,
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
        }),
        run_at: new Date(),
      })
      .execute();

    return { ...list, status: 'refreshing' };
  }

  public async executeListRefresh(tenant_id: string, id: string, user_id: string): Promise<any> {
    const auth: IAuthKeyPayload = {
      tenant_id,
      user_id,
      name: 'System Worker',
      session_id: 'worker-session',
    };

    const list = (await this.getOneById({ tenant_id, id })) as any;
    if (!list) {
      throw new Error(`List ${id} not found`);
    }
    if (!list.is_dynamic) {
      return list;
    }

    const definition = list.definition as getAllOptionsType;
    if (!definition) {
      // Set back to idle if no definition
      await this.update({
        tenant_id,
        id,
        row: {
          status: 'idle',
          updated_at: new Date(),
          updatedby_id: user_id,
        } as any,
      });
      return list;
    }

    try {
      if (list.object === 'people') {
        // Clear current mappings
        await this.mapListsPersonsRepo.db
          .deleteFrom('map_lists_persons')
          .where('tenant_id', '=', tenant_id)
          .where('list_id', '=', id)
          .execute();

        // Resolve and insert new mappings
        const result = await this.personsController.getAllWithAddress(auth, definition);
        const rows = result.rows.map((p) => ({
          tenant_id: tenant_id,
          list_id: list.id,
          person_id: p['id'],
          createdby_id: user_id,
          updatedby_id: user_id,
        }));
        if (rows.length) {
          await this.mapListsPersonsRepo.addMany({
            rows: rows as OperationDataType<'map_lists_persons', 'insert'>[],
          });
        }
      } else if (list.object === 'households') {
        // Clear current mappings
        await this.mapListsHouseholdsRepo.db
          .deleteFrom('map_lists_households')
          .where('tenant_id', '=', tenant_id)
          .where('list_id', '=', id)
          .execute();

        // Resolve and insert new mappings
        const result = await this.householdsController.getAllWithPeopleCount(auth, definition);
        const rows = result.rows.map((h) => ({
          tenant_id: tenant_id,
          list_id: list.id,
          household_id: h['id'],
          createdby_id: user_id,
          updatedby_id: user_id,
        }));
        if (rows.length) {
          await this.mapListsHouseholdsRepo.addMany({
            rows: rows as OperationDataType<'map_lists_households', 'insert'>[],
          });
        }
      }

      // Update refreshed timestamp and status back to idle
      const updated = await this.update({
        tenant_id,
        id,
        row: {
          status: 'idle',
          last_refreshed_at: new Date(),
          updated_at: new Date(),
          updatedby_id: user_id,
        } as any,
      });

      return updated;
    } catch (error) {
      // Set status to failed
      await this.update({
        tenant_id,
        id,
        row: {
          status: 'failed',
          updated_at: new Date(),
          updatedby_id: user_id,
        } as any,
      });
      throw error;
    }
  }

  public async getListStats(auth: IAuthKeyPayload, id: string): Promise<any> {
    const list = (await this.getOneById({ tenant_id: auth.tenant_id, id })) as any;
    if (!list) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' });
    }

    // Fetch all newsletters that are sent
    const newsletters = await this.getRepo()
      .db.selectFrom('newsletters')
      .selectAll()
      .where('tenant_id', '=', auth.tenant_id)
      .where('status', '=', 'sent')
      .execute();

    // Filter newsletters in JS where their target_lists matches this list
    const targetedNewsletters = newsletters.filter((n) => {
      if (!n.target_lists) return false;
      // After migration 2026-07-01-a-schema-improvements, target_lists is a jsonb column returned as a parsed object.
      // Support legacy string values too (pre-migration rows or test data).
      let parsed: unknown = n.target_lists;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          /* fall through */
        }
      }
      if (Array.isArray(parsed)) {
        return parsed.includes(id);
      }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const include = Array.isArray(obj['include']) ? (obj['include'] as string[]) : [];
        return include.includes(id);
      }
      if (typeof parsed === 'string') {
        return parsed
          .split(',')
          .map((s) => s.trim())
          .includes(id);
      }
      return false;
    });

    // Compute aggregated metrics
    const totalNewsletters = targetedNewsletters.length;
    let totalDelivered = 0;
    let totalOpens = 0;
    let totalClicks = 0;

    for (const n of targetedNewsletters) {
      totalDelivered += Number(n.delivered_count ?? 0);
      totalOpens += Number(n.unique_opens ?? 0);
      totalClicks += Number(n.unique_clicks ?? 0);
    }

    const avgOpenRate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0;
    const avgClickRate = totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0;

    return {
      totalNewsletters,
      totalDelivered,
      avgOpenRate,
      avgClickRate,
      newsletters: targetedNewsletters.map((n) => ({
        id: n.id,
        name: n.name,
        subject: n.subject,
        send_date: n.send_date,
        total_recipients: n.total_recipients,
        delivered_count: n.delivered_count,
        open_rate: n.open_rate,
        click_rate: n.click_rate,
      })),
    };
  }

  public getHouseholdsByListId(auth: IAuthKeyPayload, list_id: string) {
    return this.getRepo().getHouseholdsByListId({ tenant_id: auth.tenant_id, list_id });
  }

  public getPersonsByListId(auth: IAuthKeyPayload, list_id: string) {
    return this.getRepo().getPersonsByListId({ tenant_id: auth.tenant_id, list_id });
  }

  public async getMemberCount(auth: IAuthKeyPayload, id: string): Promise<number> {
    const list = (await this.getOneById({ tenant_id: auth.tenant_id, id })) as any;
    if (!list) return 0;
    if (list.is_dynamic && list.definition) {
      const opts = { ...(list.definition as getAllOptionsType), startRow: 0, endRow: 0 };
      if (list.object === 'people') {
        const data = await this.personsController.getAllWithAddress(auth, opts);
        return data.count;
      } else {
        const data = await this.householdsController.getAllWithPeopleCount(auth, opts);
        return data.count;
      }
    } else {
      if (list.object === 'people') {
        const result = await this.mapListsPersonsRepo.db
          .selectFrom('map_lists_persons')
          .select(({ fn }) => fn.countAll().as('count'))
          .where('tenant_id', '=', auth.tenant_id)
          .where('list_id', '=', id)
          .executeTakeFirst();
        return Number(result?.count ?? 0);
      } else {
        const result = await this.mapListsHouseholdsRepo.db
          .selectFrom('map_lists_households')
          .select(({ fn }) => fn.countAll().as('count'))
          .where('tenant_id', '=', auth.tenant_id)
          .where('list_id', '=', id)
          .executeTakeFirst();
        return Number(result?.count ?? 0);
      }
    }
  }

  public async updateList(id: string, row: UpdateListType, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = {
      ...row,
      updatedby_id: auth.user_id,
    };
    const result = await this.update({
      tenant_id: auth.tenant_id,
      id,
      row: rowWithUpdatedBy as OperationDataType<'lists', 'update'>,
    });

    // If the list is dynamic and definition or dynamics was updated, queue a refresh job
    const list = (await this.getOneById({ tenant_id: auth.tenant_id, id })) as any;
    if (list && list.is_dynamic && (row.definition !== undefined || row.is_dynamic === true)) {
      // Update status to refreshing
      await this.update({
        tenant_id: auth.tenant_id,
        id,
        row: {
          status: 'refreshing',
          updatedby_id: auth.user_id,
          updated_at: new Date(),
        } as any,
      });

      await this.getRepo()
        .db.insertInto('background_jobs')
        .values({
          tenant_id: auth.tenant_id,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'refresh_list',
            list_id: id,
            tenant_id: auth.tenant_id,
            user_id: auth.user_id,
          }),
          run_at: new Date(),
        })
        .execute();
    }

    return result;
  }

  public override async delete(tenant_id: string, idToDelete: string, userId?: string) {
    await this.mapListsPersonsRepo.db
      .deleteFrom('map_lists_persons')
      .where('tenant_id', '=', tenant_id)
      .where('list_id', '=', idToDelete)
      .execute();

    await this.mapListsHouseholdsRepo.db
      .deleteFrom('map_lists_households')
      .where('tenant_id', '=', tenant_id)
      .where('list_id', '=', idToDelete)
      .execute();

    return super.delete(tenant_id as any, idToDelete, userId);
  }

  public override async deleteMany(tenant_id: string, idsToDelete: string[]) {
    if (idsToDelete.length === 0) return false;

    await this.mapListsPersonsRepo.db
      .deleteFrom('map_lists_persons')
      .where('tenant_id', '=', tenant_id)
      .where('list_id', 'in', idsToDelete)
      .execute();

    await this.mapListsHouseholdsRepo.db
      .deleteFrom('map_lists_households')
      .where('tenant_id', '=', tenant_id)
      .where('list_id', 'in', idsToDelete)
      .execute();

    return super.deleteMany(tenant_id as any, idsToDelete);
  }

  public override async getOneById(input: { tenant_id: string; id: string }) {
    const list = (await super.getOneById(input)) as any;
    if (list && list.is_dynamic) {
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      if (!list.last_refreshed_at || new Date(list.last_refreshed_at) < oneDayAgo) {
        if (list.status !== 'refreshing') {
          // Lazily trigger refresh in background
          const mockAuth: IAuthKeyPayload = {
            tenant_id: input.tenant_id,
            user_id: list.createdby_id,
            name: 'System Worker',
            session_id: 'lazy-refresh',
          };
          const promise = this.refreshList(mockAuth, input.id).catch((err) =>
            logger.error({ err }, `Failed to lazily queue refresh for list ${input.id}`),
          );
          (this as any)._lastLazyRefreshPromise = promise;
        }
      }
    }
    if (!list) return list;
    return this.resolveCreatorAndUpdater(input.tenant_id, list);
  }
}
