import type {
  AddListType,
  IAuthKeyPayload,
  UpdateListType,
  getAllOptionsType,
} from '../../../../../../libs/common/src';
import { getAllOptions } from '../../../../../../libs/common/src';
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

/**
 * The live membership of a list at the moment of the call.
 *
 * - Smart lists (`is_dynamic = true`) re-run their stored `definition` against
 *   the tenant's people/households and return whoever matches *right now*.
 * - Static lists read the fixed snapshot saved in `map_lists_persons` /
 *   `map_lists_households` at creation time.
 *
 * Exported for downstream consumers that need "who is in this list today":
 * canvassing turf cutting (§13, universe = a smart list), automations
 * (§16, List-joined trigger), and CSV import add-to-static-list (§17).
 */
export interface ListCurrentMembers {
  object: 'people' | 'households';
  ids: string[];
  count: number;
}

/** One thing that references a list (drives "LAST USED IN" and delete confirms). */
export interface ListConsumer {
  id: string;
  name: string;
  kind: 'newsletter' | 'form' | 'team';
}

/** Everything that references a list, grouped by kind. `total` is the flat count. */
export interface ListConsumers {
  newsletters: ListConsumer[];
  forms: ListConsumer[];
  teams: ListConsumer[];
  total: number;
}

/** The subset of a list row this module reasons about (narrowed from the DB row). */
interface ListShape {
  id: string;
  object: 'people' | 'households';
  is_dynamic: boolean;
  definition: getAllOptionsType | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Does a `target_lists` JSONB value reference the given list id? Tolerates the
 * shapes seen in the wild: an id array, an `{ include: [...] }` object, a
 * comma-separated string, or a JSON string of any of those.
 */
function targetListsIncludes(target: unknown, id: string): boolean {
  let parsed: unknown = target;
  if (typeof target === 'string') {
    try {
      parsed = JSON.parse(target);
    } catch {
      return target
        .split(',')
        .map((s: string) => s.trim())
        .includes(id);
    }
  }
  if (Array.isArray(parsed)) return parsed.map((v) => String(v)).includes(id);
  if (isRecord(parsed)) {
    const include = Array.isArray(parsed['include']) ? parsed['include'] : [];
    return include.map((v) => String(v)).includes(id);
  }
  return false;
}

/**
 * Narrow a raw list row (or the resolved controller shape) to the fields this
 * module needs, parsing the stored JSONB `definition` through its Zod schema
 * rather than casting it — so a malformed definition surfaces as `null`, not a
 * runtime blow-up deeper in the query pipeline.
 */
function toListShape(row: unknown): ListShape | null {
  if (!isRecord(row)) return null;
  const object = row['object'];
  if (object !== 'people' && object !== 'households') return null;
  const parsed = getAllOptions.safeParse(row['definition'] ?? undefined);
  return {
    id: String(row['id']),
    object,
    is_dynamic: row['is_dynamic'] === true,
    definition: parsed.success ? (parsed.data ?? null) : null,
  };
}

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

    // Sent newsletters that targeted this list — an indexed join on
    // map_newsletters_lists (FK-backed), instead of the old fetch-everything
    // JS filter over the legacy JSONB target_lists document.
    const targetedNewsletters = await this.getRepo()
      .db.selectFrom('newsletters')
      .innerJoin('map_newsletters_lists', 'map_newsletters_lists.newsletter_id', 'newsletters.id')
      .selectAll('newsletters')
      .where('newsletters.tenant_id', '=', auth.tenant_id)
      .where('newsletters.status', '=', 'sent')
      .where('map_newsletters_lists.tenant_id', '=', auth.tenant_id)
      .where('map_newsletters_lists.list_id', '=', id)
      .where('map_newsletters_lists.mode', '=', 'include')
      .execute();

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

  /**
   * The live membership of a list, resolved the way §8 defines each type:
   * smart lists re-run their stored definition; static lists read the saved
   * snapshot. Reusable by turf cutting (§13), automations (§16) and CSV import
   * (§17) — anything that needs "who is in this list today".
   */
  public async getCurrentMembers(auth: IAuthKeyPayload, id: string): Promise<ListCurrentMembers> {
    const raw = await this.getOneById({ tenant_id: auth.tenant_id, id });
    const list = toListShape(raw);
    if (!list) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' });
    }

    // Smart list: re-run the definition against live data.
    if (list.is_dynamic && list.definition) {
      if (list.object === 'people') {
        const data = await this.personsController.getAllWithAddress(auth, list.definition);
        const ids = data.rows.map((r) => String(r['id']));
        return { object: 'people', ids, count: data.count };
      }
      const data = await this.householdsController.getAllWithPeopleCount(auth, list.definition);
      const ids = data.rows.map((r) => String(r['id']));
      return { object: 'households', ids, count: data.count };
    }

    // Static list (or smart with no definition): read the saved snapshot.
    if (list.object === 'people') {
      const rows = await this.mapListsPersonsRepo.db
        .selectFrom('map_lists_persons')
        .select('person_id')
        .where('tenant_id', '=', auth.tenant_id)
        .where('list_id', '=', id)
        .execute();
      const ids = rows.map((r) => String(r.person_id));
      return { object: 'people', ids, count: ids.length };
    }
    const rows = await this.mapListsHouseholdsRepo.db
      .selectFrom('map_lists_households')
      .select('household_id')
      .where('tenant_id', '=', auth.tenant_id)
      .where('list_id', '=', id)
      .execute();
    const ids = rows.map((r) => String(r.household_id));
    return { object: 'households', ids, count: ids.length };
  }

  /**
   * Everything that references a list — newsletters, forms and teams/turfs.
   * Drives the "LAST USED IN" column and the delete-confirm body, which must
   * name a list's consumers before it can be removed (§8).
   */
  public async getConsumers(auth: IAuthKeyPayload, id: string): Promise<ListConsumers> {
    const tenant_id = auth.tenant_id;

    // Newsletters and forms link to lists via a `target_lists` JSONB column;
    // teams link via the map_teams_lists junction. Newsletter/form membership
    // is resolved in JS (same shape-tolerant parse getListStats uses).
    const newsletterRows = await this.getRepo()
      .db.selectFrom('newsletters')
      .select(['id', 'name', 'target_lists'])
      .where('tenant_id', '=', tenant_id)
      .execute();

    const formRows = await this.getRepo()
      .db.selectFrom('web_forms')
      .select(['id', 'name', 'target_lists'])
      .where('tenant_id', '=', tenant_id)
      .execute();

    const teamRows = await this.getRepo()
      .db.selectFrom('teams')
      .innerJoin('map_teams_lists', 'map_teams_lists.team_id', 'teams.id')
      .select(['teams.id as id', 'teams.name as name'])
      .where('teams.tenant_id', '=', tenant_id)
      .where('map_teams_lists.list_id', '=', id)
      .execute();

    const newsletters: ListConsumer[] = newsletterRows
      .filter((r) => targetListsIncludes(r.target_lists, id))
      .map((r) => ({ id: String(r.id), name: r.name, kind: 'newsletter' as const }));
    const forms: ListConsumer[] = formRows
      .filter((r) => targetListsIncludes(r.target_lists, id))
      .map((r) => ({ id: String(r.id), name: r.name, kind: 'form' as const }));
    const teams: ListConsumer[] = teamRows.map((r) => ({ id: String(r.id), name: r.name, kind: 'team' as const }));

    return {
      newsletters,
      forms,
      teams,
      total: newsletters.length + forms.length + teams.length,
    };
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
