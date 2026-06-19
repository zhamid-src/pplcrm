import { SelectQueryBuilder, Transaction, sql } from 'kysely';
import { BaseRepository, JoinedQueryParams } from '../../../lib/base.repo';
import { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class VolunteerEventsRepo extends BaseRepository<'volunteer_events'> {
  constructor() {
    super('volunteer_events');
  }

  /**
   * Get all volunteer events with the count of signed up volunteers.
   */
  public async getAllEventsWithCount(
    input: {
      tenant_id: string;
      options?: any;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: any[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = this.normalizeSearch(options.searchStr);
    const filterModel = (options.filterModel ?? {}) as Record<string, any>;

    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) => {
      let q = qb.where('volunteer_events.tenant_id', '=', tenantId).$if(!!searchStr, (qb2) => {
        const text = searchStr;
        return qb2.where(
          sql`(
              LOWER(volunteer_events.name) LIKE ${text} OR
              LOWER(volunteer_events.description) LIKE ${text} OR
              LOWER(volunteer_events.location_address) LIKE ${text}
            )` as any,
        );
      });

      // Archive filter based on event time
      const includeArchived = (options as any).includeArchived === true;
      if (includeArchived) {
        q = q.where('volunteer_events.end_time', '<', new Date());
      } else {
        q = q.where('volunteer_events.end_time', '>=', new Date());
      }

      // Apply basic column filters
      q = this.applyColumnFilter(q, 'volunteer_events.name', filterModel['name']);
      q = this.applyColumnFilter(q, 'volunteer_events.location_address', filterModel['location_address']);

      return q;
    };

    // Count query
    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count('volunteer_events.id').as('total')])
      .execute();
    const count = Number(countResult[0]?.['total'] || 0);

    // Data query
    const rows = await applyFilters(this.getSelect(trx))
      .select([
        'volunteer_events.id',
        'volunteer_events.tenant_id',
        'volunteer_events.name',
        'volunteer_events.description',
        'volunteer_events.location_address',
        'volunteer_events.start_time',
        'volunteer_events.end_time',
        'volunteer_events.capacity',
        'volunteer_events.created_at',
        'volunteer_events.updated_at',
      ])
      .select((eb) => [
        eb
          .selectFrom('volunteer_shifts')
          .whereRef('volunteer_shifts.event_id', '=', 'volunteer_events.id')
          .select(({ fn }) => [fn.count<number>('volunteer_shifts.id').as('volunteers_count')])
          .as('volunteers_count'),
      ])
      .groupBy([
        'volunteer_events.id',
        'volunteer_events.tenant_id',
        'volunteer_events.name',
        'volunteer_events.description',
        'volunteer_events.location_address',
        'volunteer_events.start_time',
        'volunteer_events.end_time',
        'volunteer_events.capacity',
        'volunteer_events.created_at',
        'volunteer_events.updated_at',
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => acc.orderBy(sort.colId as any, sort.sort), qb),
      )
      .$if(!options.sortModel?.length, (qb) => qb.orderBy('volunteer_events.start_time', 'desc'))
      .$if(typeof options.startRow === 'number' && typeof options.endRow === 'number', (qb) =>
        qb.offset(options.startRow!).limit(options.endRow! - options.startRow!),
      )
      .execute();

    return {
      rows,
      count,
    };
  }

  /**
   * Get volunteer roster (shifts) for a specific event.
   */
  public async getShiftsForEvent(input: { tenant_id: string; event_id: string }, trx?: Transaction<Models>) {
    const db = trx || (BaseRepository as any)['_db'];
    return db
      .selectFrom('volunteer_shifts')
      .innerJoin('persons', 'persons.id', 'volunteer_shifts.person_id')
      .select([
        'volunteer_shifts.id',
        'volunteer_shifts.event_id',
        'volunteer_shifts.person_id',
        'volunteer_shifts.status',
        'volunteer_shifts.hours_worked',
        'volunteer_shifts.notes',
        'volunteer_shifts.created_at',
        'volunteer_shifts.updated_at',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
      ])
      .where('volunteer_shifts.tenant_id', '=', input.tenant_id)
      .where('volunteer_shifts.event_id', '=', input.event_id)
      .orderBy('persons.last_name', 'asc')
      .execute();
  }

  /**
   * Add a volunteer to an event shift.
   */
  public async signupVolunteer(
    input: {
      tenant_id: string;
      event_id: string;
      person_id: string;
      status?: 'signed_up' | 'attended' | 'no_show' | 'cancelled';
      hours_worked?: number | null;
      notes?: string | null;
      user_id: string;
    },
    trx?: Transaction<Models>,
  ) {
    const db = trx || (BaseRepository as any)['_db'];

    // Check if shift already exists
    const existing = await db
      .selectFrom('volunteer_shifts')
      .select('id')
      .where('tenant_id', '=', input.tenant_id)
      .where('event_id', '=', input.event_id)
      .where('person_id', '=', input.person_id)
      .executeTakeFirst();

    if (existing) {
      throw new Error('This person is already signed up for this event.');
    }

    const row = {
      tenant_id: input.tenant_id,
      event_id: input.event_id,
      person_id: input.person_id,
      status: input.status ?? 'signed_up',
      hours_worked: input.hours_worked ?? null,
      notes: input.notes ?? null,
      createdby_id: input.user_id,
      updatedby_id: input.user_id,
    };

    return db.insertInto('volunteer_shifts').values(row).returningAll().executeTakeFirst();
  }

  /**
   * Update a volunteer shift (e.g. status, hours, notes).
   */
  public async updateShift(
    input: {
      tenant_id: string;
      id: string;
      row: {
        status?: 'signed_up' | 'attended' | 'no_show' | 'cancelled';
        hours_worked?: number | null;
        notes?: string | null;
      };
      user_id: string;
    },
    trx?: Transaction<Models>,
  ) {
    const db = trx || (BaseRepository as any)['_db'];
    return db
      .updateTable('volunteer_shifts')
      .set({
        ...input.row,
        updatedby_id: input.user_id,
        updated_at: sql`now()`,
      })
      .where('tenant_id', '=', input.tenant_id)
      .where('id', '=', input.id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Remove/Delete a shift.
   */
  public async deleteShift(input: { tenant_id: string; id: string }, trx?: Transaction<Models>) {
    const db = trx || (BaseRepository as any)['_db'];
    const res = await db
      .deleteFrom('volunteer_shifts')
      .where('tenant_id', '=', input.tenant_id)
      .where('id', '=', input.id)
      .executeTakeFirst();
    return Number(res.numDeletedRows || 0) > 0;
  }

  /**
   * Get shift history for a person.
   */
  public async getHistoryForPerson(input: { tenant_id: string; person_id: string }, trx?: Transaction<Models>) {
    const db = trx || (BaseRepository as any)['_db'];
    return db
      .selectFrom('volunteer_shifts')
      .innerJoin('volunteer_events', 'volunteer_events.id', 'volunteer_shifts.event_id')
      .select([
        'volunteer_shifts.id',
        'volunteer_shifts.event_id',
        'volunteer_shifts.status',
        'volunteer_shifts.hours_worked',
        'volunteer_shifts.notes',
        'volunteer_shifts.created_at',
        'volunteer_events.name as event_name',
        'volunteer_events.start_time',
        'volunteer_events.end_time',
      ])
      .where('volunteer_shifts.tenant_id', '=', input.tenant_id)
      .where('volunteer_shifts.person_id', '=', input.person_id)
      .orderBy('volunteer_events.start_time', 'desc')
      .execute();
  }

  /**
   * Get aggregated stats for a volunteer (person).
   */
  public async getVolunteerStats(input: { tenant_id: string; person_id: string }, trx?: Transaction<Models>) {
    const db = trx || (BaseRepository as any)['_db'];

    const result = await db
      .selectFrom('volunteer_shifts')
      .select((eb: any) => [eb.fn.count('id').as('shifts_count'), eb.fn.sum('hours_worked').as('total_hours')])
      .where('tenant_id', '=', input.tenant_id)
      .where('person_id', '=', input.person_id)
      .where('status', '=', 'attended')
      .executeTakeFirst();

    return {
      shifts_count: Number((result as any)?.shifts_count || 0),
      total_hours: parseFloat((result as any)?.total_hours || '0.0'),
    };
  }
}
