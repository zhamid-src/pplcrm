import {
  ExportCsvInputType,
  ExportCsvResponseType,
  IAuthKeyPayload,
  getAllOptionsType,
} from '../../../../../../libs/common/src';
import { TRPCError } from '@trpc/server';
import { BaseController } from '../../lib/base.controller';
import { QueryParams } from '../../lib/base.repo';
import { MapListsPersonsRepo } from '../lists/repositories/map-lists-persons.repo';
import { MapPersonsTagRepo } from './repositories/map-persons-tags.repo';
import { PersonsRepo } from './repositories/persons.repo';
import { MapTeamsPersonsRepo } from '../teams/repositories/map-teams-persons.repo';

export class PersonsController extends BaseController<'persons', PersonsRepo> {
  private mapPersonsTagRepo = new MapPersonsTagRepo();
  private mapListsPersonsRepo = new MapListsPersonsRepo();
  private mapTeamsPersonsRepo = new MapTeamsPersonsRepo();

  constructor() {
    super(new PersonsRepo());
  }

  public getAllWithAddress(
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ): Promise<{ rows: { [x: string]: unknown }[]; count: number }> {
    const { tags, ...queryParams } = options || {};
    return this.getRepo().getAllWithAddress({
      tenant_id: auth.tenant_id,
      options: queryParams as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
      tags,
    });
  }

  public getByHouseholdId(household_id: string, auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getByHouseholdId({
      id: household_id,
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'persons'>,
    });
  }

  public getByCompanyId(company_id: string, auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getByCompanyId({
      id: company_id,
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'persons'>,
    });
  }

  public countByCompanyId(company_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().countByCompanyId({ id: company_id, tenant_id: auth.tenant_id });
  }

  public getDistinctTags(auth: IAuthKeyPayload, type?: 'tag' | 'issue') {
    return this.getRepo().getDistinctTags(auth.tenant_id, type);
  }

  public getTags(person_id: string, auth: IAuthKeyPayload, type?: 'tag' | 'issue') {
    return this.getRepo().getTags({ id: person_id, tenant_id: auth.tenant_id, type });
  }

  public async moveEntireHousehold(oldHouseholdId: string, newHouseholdId: string, tenantId: string) {
    return this.getRepo()
      .transaction()
      .execute(async (trx) => {
        return await trx
          .updateTable('persons')
          .set({ household_id: newHouseholdId })
          .where('household_id', '=', oldHouseholdId)
          .where('tenant_id', '=', tenantId)
          .returningAll()
          .execute();
      });
  }

  public override async deleteMany(tenant_id: string, idsToDelete: string[], force?: boolean): Promise<boolean> {
    if (!idsToDelete?.length) return false;
    return await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        // Check if any person is a team captain
        const captainedTeams = await trx
          .selectFrom('teams')
          .select(['id', 'name', 'team_captain_id'])
          .where('tenant_id', '=', tenant_id)
          .where('team_captain_id', 'in', idsToDelete)
          .execute();

        if (captainedTeams.length > 0 && !force) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'One or more selected people are team captains. Deleting them will remove them as captain. Do you want to proceed?',
          });
        }

        // Unlink captaincy if forced and captained teams exist
        if (captainedTeams.length > 0) {
          await trx
            .updateTable('teams')
            .set({ team_captain_id: null })
            .where('tenant_id', '=', tenant_id)
            .where('team_captain_id', 'in', idsToDelete)
            .execute();
        }

        // Delete volunteer shifts
        await trx
          .deleteFrom('volunteer_shifts')
          .where('tenant_id', '=', tenant_id)
          .where('person_id', 'in', idsToDelete)
          .execute();

        // Delete team mappings
        await this.mapTeamsPersonsRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete tag mappings
        await this.mapPersonsTagRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete list mappings
        await this.mapListsPersonsRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete persons within the same transaction
        const result = await this.getRepo().deleteMany({ tenant_id: tenant_id as any, ids: idsToDelete as any }, trx);

        return result;
      });
  }

  public override async delete(
    tenant_id: string,
    idToDelete: string,
    userId?: string,
    force?: boolean,
  ): Promise<boolean> {
    const result = await this.deleteMany(tenant_id, [idToDelete], force);
    try {
      if (userId) {
        await this.userActivity.log({
          tenant_id: tenant_id,
          user_id: userId,
          activity: 'delete',
          entity: 'persons',
          entity_id: idToDelete ? String(idToDelete) : null,
          quantity: 1,
          metadata: { id: idToDelete },
        });
      }
    } catch (e) {
      console.error('Failed to log delete person activity', e);
    }
    return result;
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getAllWithAddress(auth, input?.options);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input) as { csv: string; fileName: string; columns: string[]; rowCount: number };
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: 'persons',
        quantity: response.rowCount,
        metadata: {
          requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
          returned_columns: response.columns.slice(0, 12),
          file_name: response.fileName,
        },
      });
      return response;
    }
    return super.exportCsv(input, auth);
  }
}
