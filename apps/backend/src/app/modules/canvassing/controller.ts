import type {
  AddTurfType,
  AssignTurfType,
  CutTurfsType,
  FieldReportRangeType,
  IAuthKeyPayload,
  LogKnockType,
  UpdateTurfType,
} from '../../../../../../libs/common/src';

import { BadRequestError, NotFoundError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { ListsController } from '../lists/controller';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import {
  cutTurfs as clusterTurfs,
  previewCut as previewCutPlan,
  type CutPreview,
  type DoorPoint,
} from './lib/cutting-engine';
import { TurfHouseholdsRepo } from './repositories/turf-households.repo';
import { TurfAssignmentsRepo, generateTurfToken } from './repositories/turf-assignments.repo';
import { TurfKnocksRepo, type FieldReport, type ResponseMix } from './repositories/turf-knocks.repo';
import { TurfsRepo, type TurfRow } from './repositories/turfs.repo';

/** Derived display status — computed from stored lifecycle + knock activity. */
export type TurfDisplayStatus = 'draft' | 'assigned' | 'in_field' | 'complete' | 'retired';

export interface TurfListItem {
  id: string;
  name: string;
  status: TurfDisplayStatus;
  list_id: string | null;
  list_name: string | null;
  ward: string | null;
  door_count: number;
  attempted: number;
  conversations: number;
  team_id: string | null;
  team_name: string | null;
  token: string | null;
  last_activity_at: string | null;
}

export interface FieldSummary {
  turfCount: number;
  inFieldCount: number;
  doorsAttempted: number;
  doorsTotal: number;
  waitingCount: number;
}

export interface InFieldToday {
  doorsKnocked: number;
  conversations: number;
  responseMix: ResponseMix;
}

export interface CompanionDoor {
  household_id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  last_outcome: string | null;
}

export interface CompanionTurf {
  turf_id: string;
  turf_name: string;
  door_count: number;
  attempted: number;
  doors: CompanionDoor[];
}

// A turf is "in the field" if a knock landed within this window.
const IN_FIELD_WINDOW_MS = 6 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const COMPANION_SOURCE = 'companion';

export class CanvassingController extends BaseController<'turfs', TurfsRepo> {
  private readonly turfHouseholds = new TurfHouseholdsRepo();
  private readonly assignments = new TurfAssignmentsRepo();
  private readonly knocks = new TurfKnocksRepo();
  private readonly lists = new ListsController();

  constructor() {
    super(new TurfsRepo());
  }

  private turfsRepo(): TurfsRepo {
    return this.getRepo();
  }

  // ------------------------------------------------------------- reads ------

  public async getTurfs(auth: IAuthKeyPayload): Promise<TurfListItem[]> {
    const [rows, progress] = await Promise.all([
      this.turfsRepo().getTurfs(auth.tenant_id),
      this.knocks.getProgressByTenant(auth.tenant_id),
    ]);
    return rows.map((r) => {
      const p = progress.get(r.id);
      const attempted = p?.attempted ?? 0;
      const lastAt = p?.last_knock_at ?? null;
      return {
        id: r.id,
        name: r.name,
        status: this.displayStatus(r, attempted, lastAt),
        list_id: r.list_id,
        list_name: r.list_name,
        ward: r.ward,
        door_count: r.door_count,
        attempted,
        conversations: p?.conversations ?? 0,
        team_id: r.team_id,
        team_name: r.team_name,
        token: r.token,
        last_activity_at: lastAt ? lastAt.toISOString() : null,
      };
    });
  }

  public async getFieldSummary(auth: IAuthKeyPayload): Promise<FieldSummary> {
    const turfs = await this.getTurfs(auth);
    let inFieldCount = 0;
    let waitingCount = 0;
    let doorsAttempted = 0;
    let doorsTotal = 0;
    for (const t of turfs) {
      doorsAttempted += t.attempted;
      doorsTotal += t.door_count;
      if (t.status === 'in_field') inFieldCount++;
      // "Waiting for a canvasser": cut but not being worked and never touched.
      if ((t.status === 'draft' || t.status === 'assigned') && t.attempted === 0) waitingCount++;
    }
    return { turfCount: turfs.length, inFieldCount, doorsAttempted, doorsTotal, waitingCount };
  }

  public async getInFieldToday(auth: IAuthKeyPayload): Promise<InFieldToday> {
    const { from, to } = this.dayWindow(new Date());
    const summary = await this.knocks.getWindowSummary({ tenant_id: auth.tenant_id, from, to });
    return { doorsKnocked: summary.doors, conversations: summary.conversations, responseMix: summary.responseMix };
  }

  public async getFieldReport(auth: IAuthKeyPayload, input: FieldReportRangeType): Promise<FieldReport> {
    const { from, to } = this.rangeToDates(input);
    return this.knocks.getFieldReport({ tenant_id: auth.tenant_id, from, to });
  }

  /** "Report exported — doors, conversations and responses by team and by day (CSV)." */
  public async exportFieldReportCsv(
    auth: IAuthKeyPayload,
    input: FieldReportRangeType,
  ): Promise<{ filename: string; content: string }> {
    const report = await this.getFieldReport(auth, input);
    const esc = (v: string | number): string => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push('Section,Key,Doors,Conversations,Support IDs');
    lines.push(['Totals', 'all', report.doors, report.conversations, report.supportIds].map(esc).join(','));
    for (const t of report.byTeam) {
      lines.push(['By team', t.team_name, t.doors, t.conversations, t.supportIds].map(esc).join(','));
    }
    for (const d of report.perDay) {
      lines.push(['By day', d.day, d.conversations + d.no_answer, d.conversations, ''].map(esc).join(','));
    }
    return { filename: `canvass-field-report-${input.range}.csv`, content: lines.join('\n') };
  }

  // ---------------------------------------------------------- cut turfs -----

  public async previewCut(auth: IAuthKeyPayload, input: CutTurfsType): Promise<CutPreview> {
    const doors = await this.resolveUniverseDoors(auth, input.list_id);
    return previewCutPlan(doors, input.doors_per_turf);
  }

  public async cutTurfs(auth: IAuthKeyPayload, input: CutTurfsType): Promise<{ created: number; unplaced: number }> {
    const doors = await this.resolveUniverseDoors(auth, input.list_id);
    const plan = clusterTurfs(doors, input.doors_per_turf);
    if (plan.turfs.length === 0) {
      throw new BadRequestError('No geocoded doors in that list yet — turfs are cut from located households.');
    }

    const repo = this.turfsRepo();
    // Continue turf numbering from the current count.
    const existing = await repo.getTurfs(auth.tenant_id);
    let n = existing.length;

    await repo.transaction().execute(async (trx) => {
      for (const cluster of plan.turfs) {
        n += 1;
        const row = {
          tenant_id: auth.tenant_id,
          name: `Turf ${n}`,
          status: 'draft',
          list_id: input.list_id,
          target_doors: input.doors_per_turf,
          centroid_lat: cluster.centroid_lat,
          centroid_lng: cluster.centroid_lng,
          ward: cluster.ward,
          notes: null,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        } as OperationDataType<'turfs', 'insert'>;
        const created = await repo.add({ row }, trx);
        const turfId = created?.id != null ? String(created.id) : '';
        if (!turfId) throw new NotFoundError('Failed to create turf');
        await this.turfHouseholds.addDoors(
          { tenant_id: auth.tenant_id, turf_id: turfId, household_ids: cluster.households, user_id: auth.user_id },
          trx,
        );
      }
    });

    return { created: plan.turfs.length, unplaced: plan.unplaced.length };
  }

  /** Re-sync a turf's doors with its smart list WITHOUT losing knock history. */
  public async refreshFromList(auth: IAuthKeyPayload, turfId: string): Promise<{ added: number; removed: number }> {
    const turf = await this.turfsRepo().getTurfCore({ tenant_id: auth.tenant_id, id: turfId });
    if (!turf) throw new NotFoundError('Turf not found');
    const listId = turf.list_id;
    if (!listId) throw new BadRequestError('This turf is not linked to a list, so it cannot be refreshed.');

    const members = new Set(await this.resolveUniverseHouseholdIds(auth, listId));
    const current = await this.turfHouseholds.getHouseholdIds({ tenant_id: auth.tenant_id, turf_id: turfId });
    const currentSet = new Set(current);

    // Drop doors no longer in the list; their knock rows persist (history kept).
    const removed = current.filter((h) => !members.has(h));
    // Add new list members that live in this turf's ward and aren't in ANY turf yet.
    const wardMembers = await this.wardMembersNotInAnyTurf(auth, turf.ward, members);
    const added = wardMembers.filter((h) => !currentSet.has(h));

    await this.turfsRepo()
      .transaction()
      .execute(async (trx) => {
        await this.turfHouseholds.removeDoors(
          { tenant_id: auth.tenant_id, turf_id: turfId, household_ids: removed },
          trx,
        );
        await this.turfHouseholds.addDoors(
          { tenant_id: auth.tenant_id, turf_id: turfId, household_ids: added, user_id: auth.user_id },
          trx,
        );
      });

    return { added: added.length, removed: removed.length };
  }

  // -------------------------------------------------------- assignment ------

  public async assignTurf(auth: IAuthKeyPayload, input: AssignTurfType): Promise<{ token: string }> {
    const turf = await this.turfsRepo().getTurfCore({ tenant_id: auth.tenant_id, id: input.turf_id });
    if (!turf) throw new NotFoundError('Turf not found');
    const teamId = input.team_id != null ? String(input.team_id) : null;
    const token = generateTurfToken();

    await this.turfsRepo()
      .transaction()
      .execute(async (trx) => {
        await this.assignments.revokeForTurf(
          { tenant_id: auth.tenant_id, turf_id: input.turf_id, user_id: auth.user_id },
          trx,
        );
        await this.assignments.create(
          { tenant_id: auth.tenant_id, turf_id: input.turf_id, team_id: teamId, token, user_id: auth.user_id },
          trx,
        );
        await this.turfsRepo().update(
          {
            tenant_id: auth.tenant_id,
            id: input.turf_id,
            row: { status: 'active', updatedby_id: auth.user_id, updated_at: new Date() },
          },
          trx,
        );
      });

    await this.userActivity.log({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      activity: 'assign',
      entity: 'turf',
      entity_id: input.turf_id,
      metadata: teamId ? { team_id: teamId } : { link: 'tokenised' },
    });

    return { token };
  }

  /** Ensure a shareable Companion link exists ("Copy a link instead"). */
  public async getCompanionLink(auth: IAuthKeyPayload, turfId: string): Promise<{ token: string }> {
    const existing = await this.assignments.getActiveByTurf({ tenant_id: auth.tenant_id, turf_id: turfId });
    if (existing) return { token: '' }; // token not re-exposed on read; issue via assign
    return this.assignTurf(auth, { turf_id: turfId, team_id: null });
  }

  public async retireTurf(auth: IAuthKeyPayload, turfId: string): Promise<void> {
    const turf = await this.turfsRepo().getTurfCore({ tenant_id: auth.tenant_id, id: turfId });
    if (!turf) throw new NotFoundError('Turf not found');
    await this.turfsRepo()
      .transaction()
      .execute(async (trx) => {
        await this.assignments.revokeForTurf(
          { tenant_id: auth.tenant_id, turf_id: turfId, user_id: auth.user_id },
          trx,
        );
        await this.turfsRepo().update(
          {
            tenant_id: auth.tenant_id,
            id: turfId,
            row: { status: 'retired', updatedby_id: auth.user_id, updated_at: new Date() },
          },
          trx,
        );
      });
    await this.userActivity.log({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      activity: 'update',
      entity: 'turf',
      entity_id: turfId,
      metadata: { retired: true },
    });
  }

  public async addTurf(auth: IAuthKeyPayload, input: AddTurfType): Promise<{ id: string }> {
    const row = {
      tenant_id: auth.tenant_id,
      name: input.name,
      status: 'draft',
      list_id: input.list_id != null ? String(input.list_id) : null,
      notes: input.notes ?? null,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'turfs', 'insert'>;
    const created = await this.turfsRepo().add({ row });
    return { id: created?.id != null ? String(created.id) : '' };
  }

  public async updateTurf(auth: IAuthKeyPayload, id: string, input: UpdateTurfType): Promise<void> {
    const row = {
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedby_id: auth.user_id,
      updated_at: new Date(),
    } as OperationDataType<'turfs', 'update'>;
    await this.turfsRepo().update({ tenant_id: auth.tenant_id, id, row });
  }

  // -------------------------------------------------- Companion (public) ----

  /** Resolve a Companion token to its turf + door list. No account required. */
  public async getCompanionTurf(token: string): Promise<CompanionTurf> {
    const assignment = await this.assignments.resolveByToken(token);
    if (!assignment) throw new NotFoundError('This canvassing link is invalid or has been retired.');
    const tenant_id = assignment.tenant_id;
    const turf_id = assignment.turf_id;

    const turf = await this.turfsRepo().getTurfCore({ tenant_id, id: turf_id });
    if (!turf) throw new NotFoundError('Turf not found');

    const [doorRows, lastOutcomes] = await Promise.all([
      this.turfHouseholds.getDoors({ tenant_id, turf_id }),
      this.knocks.getLastOutcomeByHousehold({ tenant_id, turf_id }),
    ]);

    const doors: CompanionDoor[] = doorRows.map((d) => ({
      household_id: d.household_id,
      address: this.formatAddress(d),
      lat: d.lat,
      lng: d.lng,
      last_outcome: lastOutcomes.get(d.household_id) ?? null,
    }));

    const attempted = doors.filter((d) => d.last_outcome != null).length;
    return {
      turf_id,
      turf_name: String(turf.name),
      door_count: doors.length,
      attempted,
      doors,
    };
  }

  /**
   * Log a knock from a Companion. Idempotent on `client_knock_id` so an offline
   * volunteer's queued re-send never double-counts. Every knock syncs live to
   * the household + person Activity log with honest "via Canvass Companion"
   * attribution under the real account that deployed the link (§22.7).
   */
  public async logKnock(input: LogKnockType): Promise<{ recorded: boolean }> {
    const assignment = await this.assignments.resolveByToken(input.token);
    if (!assignment) throw new NotFoundError('This canvassing link is invalid or has been retired.');
    const tenant_id = assignment.tenant_id;
    const turf_id = assignment.turf_id;

    // The door must belong to this turf — a token cannot log against other doors.
    const doorIds = new Set(await this.turfHouseholds.getHouseholdIds({ tenant_id, turf_id }));
    if (!doorIds.has(String(input.household_id))) {
      throw new BadRequestError('That household is not part of this turf.');
    }

    const actor = assignment.created_by;
    const knockedAt = input.knocked_at ? new Date(input.knocked_at) : new Date();

    const row = {
      tenant_id,
      turf_id,
      household_id: String(input.household_id),
      person_id: input.person_id != null ? String(input.person_id) : null,
      outcome: input.outcome,
      response: input.response ?? null,
      notes: input.notes ?? null,
      source: COMPANION_SOURCE,
      canvasser_name: input.canvasser_name ?? null,
      client_knock_id: input.client_knock_id,
      knocked_at: knockedAt,
      createdby_id: actor,
      updatedby_id: actor,
    } as OperationDataType<'turf_knocks', 'insert'>;

    const newId = await this.knocks.insertIdempotent(row);
    if (!newId) return { recorded: false }; // already synced (offline re-send)

    const via = input.canvasser_name ? `via Canvass Companion (${input.canvasser_name})` : 'via Canvass Companion';
    const metadata = {
      source: COMPANION_SOURCE,
      via,
      turf_id,
      outcome: input.outcome,
      response: input.response ?? null,
      canvasser_name: input.canvasser_name ?? null,
    };
    // Sync to the household activity, and to the person's if one answered.
    await this.userActivity.log({
      tenant_id,
      user_id: actor,
      activity: 'update',
      entity: 'household',
      entity_id: String(input.household_id),
      metadata,
      performed_by: actor,
    });
    if (input.person_id != null) {
      await this.userActivity.log({
        tenant_id,
        user_id: actor,
        activity: 'update',
        entity: 'person',
        entity_id: String(input.person_id),
        metadata,
        performed_by: actor,
      });
    }

    return { recorded: true };
  }

  // ----------------------------------------------------------- helpers ------

  private displayStatus(row: TurfRow, attempted: number, lastAt: Date | null): TurfDisplayStatus {
    switch (row.status) {
      case 'retired':
        return 'retired';
      case 'draft':
        return 'draft';
      case 'active': {
        if (row.door_count > 0 && attempted >= row.door_count) return 'complete';
        if (lastAt && Date.now() - lastAt.getTime() <= IN_FIELD_WINDOW_MS) return 'in_field';
        return 'assigned';
      }
      default: {
        // Any unexpected stored status is treated as assigned rather than thrown,
        // so a future lifecycle value never breaks the whole list.
        return 'assigned';
      }
    }
  }

  private async resolveUniverseDoors(auth: IAuthKeyPayload, listId: string): Promise<DoorPoint[]> {
    const householdIds = await this.resolveUniverseHouseholdIds(auth, listId);
    return this.turfsRepo().getHouseholdsGeo({ tenant_id: auth.tenant_id, household_ids: householdIds });
  }

  /** Reuse Lists' getCurrentMembers (Wave 1C) — never re-derive membership. */
  private async resolveUniverseHouseholdIds(auth: IAuthKeyPayload, listId: string): Promise<string[]> {
    const members = await this.lists.getCurrentMembers(auth, listId);
    if (members.object === 'households') return members.ids;
    // A people list → map to their distinct households.
    return this.turfsRepo().getHouseholdIdsForPersons({ tenant_id: auth.tenant_id, person_ids: members.ids });
  }

  private async wardMembersNotInAnyTurf(
    auth: IAuthKeyPayload,
    ward: string | null,
    members: Set<string>,
  ): Promise<string[]> {
    if (members.size === 0) return [];
    const geo = await this.turfsRepo().getHouseholdsGeo({
      tenant_id: auth.tenant_id,
      household_ids: [...members],
    });
    const inWard = geo.filter((d) => (d.ward ?? null) === ward).map((d) => d.household_id);
    // Exclude households already assigned to any turf.
    const assigned = await this.householdsInAnyTurf(auth, inWard);
    return inWard.filter((h) => !assigned.has(h));
  }

  private async householdsInAnyTurf(auth: IAuthKeyPayload, householdIds: string[]): Promise<Set<string>> {
    if (householdIds.length === 0) return new Set();
    const rows = await this.turfsRepo()
      .db.selectFrom('turf_households')
      .where('tenant_id', '=', auth.tenant_id)
      .where('household_id', 'in', householdIds)
      .select('household_id')
      .distinct()
      .execute();
    return new Set(rows.map((r) => String(r.household_id)));
  }

  private formatAddress(d: {
    street_num: string | null;
    street1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  }): string {
    const line = [d.street_num, d.street1].filter(Boolean).join(' ');
    const tail = [d.city, d.state, d.zip].filter(Boolean).join(', ');
    return [line, tail].filter(Boolean).join(', ') || 'Address unavailable';
  }

  private dayWindow(now: Date): { from: Date; to: Date } {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = new Date(from.getTime() + MS_PER_DAY);
    return { from, to };
  }

  private rangeToDates(input: FieldReportRangeType): { from: Date; to: Date } {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (input.range) {
      case 'today':
        return { from: startOfToday, to: new Date(startOfToday.getTime() + MS_PER_DAY) };
      case 'yesterday':
        return { from: new Date(startOfToday.getTime() - MS_PER_DAY), to: startOfToday };
      case 'week':
        return {
          from: new Date(startOfToday.getTime() - 6 * MS_PER_DAY),
          to: new Date(startOfToday.getTime() + MS_PER_DAY),
        };
      case 'month':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(startOfToday.getTime() + MS_PER_DAY),
        };
      case 'campaign':
        return { from: new Date(0), to: new Date(startOfToday.getTime() + MS_PER_DAY) };
      case 'custom': {
        const from = input.from ? new Date(input.from) : new Date(0);
        const to = input.to ? new Date(input.to) : new Date(startOfToday.getTime() + MS_PER_DAY);
        return { from, to };
      }
      default: {
        const _exhaustive: never = input.range;
        return { from: _exhaustive, to: now };
      }
    }
  }
}
