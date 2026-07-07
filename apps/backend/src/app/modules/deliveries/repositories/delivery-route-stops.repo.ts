import type { Transaction } from 'kysely';
import { sql } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export interface RouteStopWithLocation {
  id: string;
  request_id: string;
  seq: number;
  leg_minutes: number;
  status: string;
  reason: string | null;
  acted_at: Date | string | null;
  acted_via: string | null;
  household_id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  first_name: string | null;
  person_id: string | null;
  request_status: string;
}

const STOP_ADDRESS_SQL = sql<string>`COALESCE(
  NULLIF(h.formatted_address, ''),
  NULLIF(TRIM(BOTH ', ' FROM CONCAT_WS(', ',
    NULLIF(CONCAT_WS(' ', h.street_num, h.street1, h.street2), ''),
    NULLIF(h.city, ''), NULLIF(h.state, ''), NULLIF(h.zip, '')
  )), ''),
  ''
)`;

export class DeliveryRouteStopsRepo extends BaseRepository<'delivery_route_stops'> {
  constructor() {
    super('delivery_route_stops');
  }

  /** All stops on a route, in visit order, joined to their household location + requester first name. */
  public async getStopsForRoute(
    tenantId: string,
    routeId: string,
    trx?: Transaction<Models>,
  ): Promise<RouteStopWithLocation[]> {
    const db = trx ?? this.db;
    const rows = await db
      .selectFrom('delivery_route_stops as s')
      .innerJoin('delivery_requests as dr', 'dr.id', 's.request_id')
      .innerJoin('households as h', 'h.id', 'dr.household_id')
      .leftJoin('persons as p', 'p.id', 'dr.person_id')
      .where('s.tenant_id', '=', tenantId)
      .where('s.route_id', '=', routeId)
      .select([
        's.id as id',
        's.request_id as request_id',
        's.seq as seq',
        's.leg_minutes as leg_minutes',
        's.status as status',
        's.reason as reason',
        's.acted_at as acted_at',
        's.acted_via as acted_via',
        'dr.household_id as household_id',
        'dr.status as request_status',
        'h.lat as lat',
        'h.lng as lng',
        'p.first_name as first_name',
        'dr.person_id as person_id',
        STOP_ADDRESS_SQL.as('address'),
      ])
      .orderBy('s.seq', 'asc')
      .execute();
    return rows.map((r) => ({
      id: String(r.id),
      request_id: String(r.request_id),
      seq: Number(r.seq),
      leg_minutes: Number(r.leg_minutes ?? 0),
      status: String(r.status),
      reason: r.reason ?? null,
      acted_at: r.acted_at ?? null,
      acted_via: r.acted_via ?? null,
      household_id: String(r.household_id),
      request_status: String(r.request_status),
      lat: r.lat != null ? Number(r.lat) : null,
      lng: r.lng != null ? Number(r.lng) : null,
      first_name: r.first_name ?? null,
      person_id: r.person_id != null ? String(r.person_id) : null,
      address: r.address ?? '',
    }));
  }
}
