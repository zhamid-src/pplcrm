import type { Transaction } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import type { Models, OperationDataType } from '../../../../../../../libs/common/src/lib/kysely.models';

export interface DoorRow {
  household_id: string;
  street_num: string | null;
  street1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
}

/** The doors (households) that belong to a turf. */
export class TurfHouseholdsRepo extends BaseRepository<'turf_households'> {
  constructor() {
    super('turf_households');
  }

  public async getHouseholdIds(
    input: { tenant_id: string; turf_id: string },
    trx?: Transaction<Models>,
  ): Promise<string[]> {
    const rows = await this.getSelect(trx)
      .select('household_id')
      .where('tenant_id', '=', input.tenant_id)
      .where('turf_id', '=', input.turf_id)
      .execute();
    return rows.map((r) => String(r.household_id));
  }

  public async addDoors(
    input: { tenant_id: string; turf_id: string; household_ids: string[]; user_id: string },
    trx?: Transaction<Models>,
  ): Promise<void> {
    if (input.household_ids.length === 0) return;
    const rows = input.household_ids.map(
      (hid) =>
        ({
          tenant_id: input.tenant_id,
          turf_id: input.turf_id,
          household_id: hid,
          createdby_id: input.user_id,
          updatedby_id: input.user_id,
        }) as OperationDataType<'turf_households', 'insert'>,
    );
    await this.getInsert(trx)
      .values(rows)
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  public async removeDoors(
    input: { tenant_id: string; turf_id: string; household_ids: string[] },
    trx?: Transaction<Models>,
  ): Promise<void> {
    if (input.household_ids.length === 0) return;
    await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('turf_id', '=', input.turf_id)
      .where('household_id', 'in', input.household_ids)
      .execute();
  }

  /** Door list with address + geocode for the Companion and the turf map. */
  public async getDoors(input: { tenant_id: string; turf_id: string }, trx?: Transaction<Models>): Promise<DoorRow[]> {
    const rows = await this.getSelect(trx)
      .innerJoin('households', 'households.id', 'turf_households.household_id')
      .where('turf_households.tenant_id', '=', input.tenant_id)
      .where('turf_households.turf_id', '=', input.turf_id)
      .select([
        'households.id as household_id',
        'households.street_num',
        'households.street1',
        'households.city',
        'households.state',
        'households.zip',
        'households.lat',
        'households.lng',
      ])
      .execute();
    return rows.map((r) => ({
      household_id: String(r.household_id),
      street_num: r.street_num ?? null,
      street1: r.street1 ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      zip: r.zip ?? null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
    }));
  }
}
