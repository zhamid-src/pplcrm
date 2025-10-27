import { IAuthKeyPayload, ImportListItem } from '@common';

import { BadRequestError, NotFoundError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { MapListsPersonsRepo } from '../lists/repositories/map-lists-persons.repo';
import { HouseholdRepo } from '../households/repositories/households.repo';
import { MapHouseholdsTagsRepo } from '../households/repositories/map-households-tags.repo';
import { MapPersonsTagRepo } from '../persons/repositories/map-persons-tags.repo';
import { PersonsRepo } from '../persons/repositories/persons.repo';
import { ImportsRepo, DataImportWithStats } from './repositories/imports.repo';

export class ImportsController extends BaseController<'data_imports', ImportsRepo> {
  private readonly personsRepo = new PersonsRepo();
  private readonly mapPersonsTagRepo = new MapPersonsTagRepo();
  private readonly mapListsPersonsRepo = new MapListsPersonsRepo();
  private readonly householdsRepo = new HouseholdRepo();
  private readonly mapHouseholdsTagsRepo = new MapHouseholdsTagsRepo();

  constructor() {
    super(new ImportsRepo());
  }

  public async list(auth: IAuthKeyPayload): Promise<ImportListItem[]> {
    const rows = await this.getRepo().getAllWithStats({ tenant_id: auth.tenant_id });
    return rows.map((row) => this.mapToListItem(row));
  }

  public async deleteImport(
    input: { id: string; deleteContacts?: boolean },
    auth: IAuthKeyPayload,
  ): Promise<{ deleted: boolean; contactsRemoved: boolean }> {
    const stats = await this.getRepo().getOneWithStats({ tenant_id: auth.tenant_id, id: input.id });
    if (!stats) throw new NotFoundError('Import not found');

    const wantsContactDeletion = Boolean(input.deleteContacts);
    const canDeleteContacts =
      stats.contact_count > 0 && stats.tag_exists && stats.tag_assignment_count > 0;

    if (wantsContactDeletion && !canDeleteContacts) {
      throw new BadRequestError('Contacts for this import can no longer be identified.');
    }

    let contactsRemoved = false;

    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        if (wantsContactDeletion && canDeleteContacts) {
          contactsRemoved = await this.deleteContactsForImport(stats.id, auth, trx);
        } else {
          await this.clearAssociations(stats.id, auth, trx);
        }

        await this.getRepo().delete({ tenant_id: auth.tenant_id as any, id: stats.id as any }, trx);
      });

    return { deleted: true, contactsRemoved };
  }

  private async deleteContactsForImport(
    importId: string,
    auth: IAuthKeyPayload,
    trx: Transaction<Models>,
  ) {
    const personIds = await this.personsRepo.getIdsByFileId(
      { tenant_id: auth.tenant_id, file_id: importId },
      trx,
    );

    if (personIds.length > 0) {
      await this.mapPersonsTagRepo.deleteByPersonIds({ tenant_id: auth.tenant_id, person_ids: personIds }, trx);
      await this.mapListsPersonsRepo.deleteByPersonIds(
        { tenant_id: auth.tenant_id, person_ids: personIds },
        trx,
      );
      await this.personsRepo.deleteMany({ tenant_id: auth.tenant_id as any, ids: personIds as any }, trx);
    }

    const householdIds = await this.householdsRepo.getIdsByFileId(
      { tenant_id: auth.tenant_id, file_id: importId, onlyEmpty: true },
      trx,
    );

    if (householdIds.length > 0) {
      await this.mapHouseholdsTagsRepo.deleteByHouseholdIds(
        { tenant_id: auth.tenant_id, household_ids: householdIds },
        trx,
      );
      await this.householdsRepo.deleteMany({ tenant_id: auth.tenant_id as any, ids: householdIds as any }, trx);
    }

    return personIds.length > 0;
  }

  private async clearAssociations(
    importId: string,
    auth: IAuthKeyPayload,
    trx: Transaction<Models>,
  ) {
    await this.personsRepo.clearFileIdForImport(
      { tenant_id: auth.tenant_id, import_id: importId, user_id: auth.user_id },
      trx,
    );
    await this.householdsRepo.clearFileIdForImport(
      { tenant_id: auth.tenant_id, import_id: importId, user_id: auth.user_id },
      trx,
    );
  }

  private mapToListItem(row: DataImportWithStats): ImportListItem {
    const tagMissing = !row.tag_exists || row.tag_assignment_count === 0;
    const canDeleteContacts = row.contact_count > 0 && !tagMissing;

    return {
      id: row.id,
      fileName: row.file_name,
      source: row.source,
      tagName: row.tag_name,
      tagMissing,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      createdBy: row.createdby_id
        ? {
            id: row.createdby_id,
            name: row.created_by_name,
            email: row.created_by_email,
          }
        : null,
      insertedCount: row.inserted_count,
      errorCount: row.error_count,
      skippedCount: row.skipped_count,
      rowCount: row.row_count,
      householdsCreated: row.households_created,
      contactCount: row.contact_count,
      householdCount: row.household_count,
      canDeleteContacts,
    };
  }
}
