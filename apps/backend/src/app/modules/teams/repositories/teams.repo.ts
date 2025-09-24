/**
 * Repository for team entities and volunteer membership counts.
 */
import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';

export class TeamsRepo extends BaseRepository<'teams'> {
  private readonly volunteerTag = 'volunteer';

  constructor() {
    super('teams');
  }

  public override async getAllWithCounts(
    input: { tenant_id: string; options?: QueryParams<'teams' | 'persons' | 'map_teams_persons'> },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;

    const startRow = typeof options.startRow === 'number' ? Math.max(0, options.startRow) : 0;
    const endRowCandidate =
      typeof options.endRow === 'number' && options.endRow > startRow ? options.endRow : startRow + 100;
    const limit = endRowCandidate - startRow;

    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .leftJoin('map_teams_persons', (join) =>
          join
            .onRef('map_teams_persons.team_id', '=', 'teams.id')
            .on('map_teams_persons.tenant_id', '=', tenantId),
        )
        .leftJoin('map_peoples_tags as mtp', (join) =>
          join
            .onRef('mtp.person_id', '=', 'map_teams_persons.person_id')
            .on('mtp.tenant_id', '=', tenantId),
        )
        .leftJoin('tags as volunteer_tag', 'volunteer_tag.id', 'mtp.tag_id')
        .leftJoin('persons as captain', 'captain.id', 'teams.team_captain_id')
        .where('teams.tenant_id', '=', tenantId)
        .$if(!!searchStr, (builder) => {
          const text = `%${searchStr}%`;
          return builder.where(
            sql`(
              LOWER(teams.name) LIKE ${text} OR
              LOWER(COALESCE(teams.description, '')) LIKE ${text} OR
              LOWER(COALESCE(captain.first_name || ' ' || captain.last_name, '')) LIKE ${text}
            )` as any,
          );
        })
        .$if(!!filterModel['name']?.value, (builder) =>
          builder.where('teams.name', 'ilike', `%${filterModel['name'].value}%`),
        )
        .$if(!!filterModel['team_captain_id']?.value, (builder) =>
          builder.where('teams.team_captain_id', '=', filterModel['team_captain_id'].value as any),
        );

    const countRow = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT teams.id`).as('total')])
      .executeTakeFirst();
    const count = Number(countRow?.['total'] ?? 0);

    const rowsRaw = await applyFilters(this.getSelect(trx))
      .select([
        'teams.id',
        'teams.name',
        'teams.description',
        'teams.team_captain_id',
        'teams.updated_at',
        sql`COALESCE(captain.first_name || ' ' || captain.last_name, '')`.as('captain_name'),
        sql<number>`COUNT(DISTINCT CASE WHEN LOWER(volunteer_tag.name) = ${this.volunteerTag} THEN map_teams_persons.person_id END)`.
          as('volunteer_count'),
      ])
      .groupBy([
        'teams.id',
        'teams.name',
        'teams.description',
        'teams.team_captain_id',
        'teams.updated_at',
        'captain.first_name',
        'captain.last_name',
      ])
      .$if(Array.isArray(options.sortModel) && options.sortModel.length > 0, (builder) => {
        return options.sortModel!.reduce((acc: any, sort: any) => {
          switch (sort.colId) {
            case 'volunteer_count':
              return acc.orderBy(sql`COUNT(DISTINCT map_teams_persons.person_id)`, sort.sort);
            case 'team_captain_name':
              return acc.orderBy(sql`COALESCE(captain.first_name || ' ' || captain.last_name, '')`, sort.sort);
            default:
              return acc.orderBy(sort.colId as any, sort.sort);
          }
        }, builder as any);
      })
      .offset(startRow)
      .limit(limit)
      .execute();

    const rows = rowsRaw.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      team_captain_id: row.team_captain_id != null ? String(row.team_captain_id) : null,
      team_captain_name: row.captain_name ? String(row.captain_name) : null,
      volunteer_count: Number(row.volunteer_count ?? 0),
      updated_at: row.updated_at,
    }));

    return { rows, count };
  }

  public async clearCaptain(input: { tenant_id: string; team_id: string }, trx?: Transaction<Models>) {
    await this.getUpdate(trx)
      .set({ team_captain_id: null })
      .where('tenant_id', '=', input.tenant_id)
      .where('id', '=', input.team_id)
      .executeTakeFirst();
  }
}
