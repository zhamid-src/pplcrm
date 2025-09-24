import { Transaction, sql } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

export class MapTeamsPersonsRepo extends BaseRepository<'map_teams_persons'> {
  constructor() {
    super('map_teams_persons');
  }

  public async getVolunteerIds(input: { tenant_id: string; team_id: string }, trx?: Transaction<Models>) {
    const rows = await this.getSelect(trx)
      .select(['person_id'])
      .where('tenant_id', '=', input.tenant_id)
      .where('team_id', '=', input.team_id)
      .execute();
    return rows.map((row) => String((row as any).person_id));
  }

  public async getTeamsForPerson(input: { tenant_id: string; person_id: string }, trx?: Transaction<Models>) {
    const rows = await this.getSelect(trx)
      .select(['map_teams_persons.team_id'])
      .innerJoin('teams', 'teams.id', 'map_teams_persons.team_id')
      .select('teams.name as team_name')
      .select(sql<boolean>`teams.team_captain_id = map_teams_persons.person_id`.as('is_captain'))
      .where('map_teams_persons.tenant_id', '=', input.tenant_id)
      .where('map_teams_persons.person_id', '=', input.person_id)
      .execute();

    return rows.map((row: any) => ({
      team_id: row.team_id != null ? String(row.team_id) : '',
      team_name: row.team_name ?? '',
      is_captain: Boolean(row.is_captain),
    }));
  }

  public async deleteByTeam(input: { tenant_id: string; team_id: string }, trx?: Transaction<Models>) {
    await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('team_id', '=', input.team_id)
      .executeTakeFirst();
  }

  public async deleteByPerson(input: { tenant_id: string; person_id: string }, trx?: Transaction<Models>) {
    await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('person_id', '=', input.person_id)
      .executeTakeFirst();
  }

  public async replaceVolunteers(
    input: { tenant_id: string; team_id: string; person_ids: string[]; user_id: string },
    trx?: Transaction<Models>,
  ) {
    const uniqueIds = Array.from(new Set(input.person_ids.filter(Boolean)));

    const runner = async (innerTrx: Transaction<Models>) => {
      const currentRows = await this.getSelect(innerTrx)
        .select(['person_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('team_id', '=', input.team_id)
        .execute();
      const currentIds = new Set(currentRows.map((row) => String((row as any).person_id)));
      const incoming = new Set(uniqueIds);

      const toRemove = Array.from(currentIds).filter((id) => !incoming.has(id));
      const toAdd = uniqueIds.filter((id) => !currentIds.has(id));

      if (toRemove.length > 0) {
        await this.getDelete(innerTrx)
          .where('tenant_id', '=', input.tenant_id)
          .where('team_id', '=', input.team_id)
          .where('person_id', 'in', toRemove)
          .executeTakeFirst();
      }

      if (toAdd.length > 0) {
        const rowsToInsert = toAdd.map((person_id) =>
          ({
            tenant_id: input.tenant_id,
            team_id: input.team_id,
            person_id,
            createdby_id: input.user_id,
            updatedby_id: input.user_id,
          }) as OperationDataType<'map_teams_persons', 'insert'>,
        );
        await this.addMany({ rows: rowsToInsert }, innerTrx);
      }
    };

    if (trx) {
      await runner(trx);
    } else {
      await this.transaction().execute(runner);
    }
  }
}
