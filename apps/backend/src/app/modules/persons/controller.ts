import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload, getAllOptionsType } from '@common';
import { BaseController } from '../../lib/base.controller';
import { QueryParams } from '../../lib/base.repo';
import { MapListsPersonsRepo } from '../lists/repositories/map-lists-persons.repo';
import { MapPersonsTagRepo } from './repositories/map-persons-tags.repo';
import { PersonsRepo } from './repositories/persons.repo';

/**
 * Controller for managing persons and their associated tags.
 */
export class PersonsController extends BaseController<'persons', PersonsRepo> {
  private mapPersonsTagRepo = new MapPersonsTagRepo();
  private mapListsPersonsRepo = new MapListsPersonsRepo();

  constructor() {
    super(new PersonsRepo());
  }

  /**
   * Get all people with their address and any assigned tags.
   */
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

  /**
   * Get all persons that belong to a given household.
   */
  public getByHouseholdId(household_id: string, auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getByHouseholdId({
      id: household_id,
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'persons'>,
    });
  }

  /**
   * Get all distinct tags assigned to any person in the tenant.
   */
  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  /**
   * Get all tags associated with a specific person.
   */
  public getTags(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags({ id: person_id, tenant_id: auth.tenant_id });
  }

  /** Override deleteMany to clear dependent mappings before deleting persons */
  public override async deleteMany(tenant_id: string, idsToDelete: string[]): Promise<boolean> {
    if (!idsToDelete?.length) return false;
    return await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        // Delete tag mappings
        await this.mapPersonsTagRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete list mappings
        await this.mapListsPersonsRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete persons within the same transaction
        return this.getRepo().deleteMany({ tenant_id: tenant_id as any, ids: idsToDelete as any }, trx);
      });
  }

  /** Override delete to reuse deleteMany path */
  public override async delete(tenant_id: string, idToDelete: string): Promise<boolean> {
    return this.deleteMany(tenant_id, [idToDelete]);
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getAllWithAddress(auth, input?.options);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input);
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
