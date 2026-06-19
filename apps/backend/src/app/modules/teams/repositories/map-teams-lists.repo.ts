import { Transaction } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import { Models, OperationDataType } from '../../../../../../../libs/common/src/lib/kysely.models';

export class MapTeamsListsRepo extends BaseRepository<'map_teams_lists'> {
  constructor() {
    super('map_teams_lists');
  }

  public async getListIds(input: { tenant_id: string; team_id: string }, trx?: Transaction<Models>) {
    const rows = await this.getSelect(trx)
      .select(['list_id'])
      .where('tenant_id', '=', input.tenant_id)
      .where('team_id', '=', input.team_id)
      .execute();
    return rows.map((row) => String((row as any).list_id));
  }

  public async deleteByTeam(input: { tenant_id: string; team_id: string }, trx?: Transaction<Models>) {
    await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('team_id', '=', input.team_id)
      .executeTakeFirst();
  }

  public async replaceLists(
    input: { tenant_id: string; team_id: string; list_ids: string[]; user_id: string },
    trx?: Transaction<Models>,
  ) {
    const uniqueIds = Array.from(new Set(input.list_ids.filter(Boolean)));

    const runner = async (innerTrx: Transaction<Models>) => {
      const currentRows = await this.getSelect(innerTrx)
        .select(['list_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('team_id', '=', input.team_id)
        .execute();
      const currentIds = new Set(currentRows.map((row) => String((row as any).list_id)));
      const incoming = new Set(uniqueIds);

      const toRemove = Array.from(currentIds).filter((id) => !incoming.has(id));
      const toAdd = uniqueIds.filter((id) => !currentIds.has(id));

      if (toRemove.length > 0) {
        await this.getDelete(innerTrx)
          .where('tenant_id', '=', input.tenant_id)
          .where('team_id', '=', input.team_id)
          .where('list_id', 'in', toRemove)
          .executeTakeFirst();
      }

      if (toAdd.length > 0) {
        const rowsToInsert = toAdd.map(
          (list_id) =>
            ({
              tenant_id: input.tenant_id,
              team_id: input.team_id,
              list_id,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            }) as OperationDataType<'map_teams_lists', 'insert'>,
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
