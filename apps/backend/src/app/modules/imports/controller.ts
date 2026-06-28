import type { IAuthKeyPayload, ImportListItem } from '../../../../../../libs/common/src';

import { BadRequestError, NotFoundError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { sql } from 'kysely';
import { MapListsPersonsRepo } from '../lists/repositories/map-lists-persons.repo';
import { HouseholdRepo } from '../households/repositories/households.repo';
import { MapHouseholdsTagsRepo } from '../households/repositories/map-households-tags.repo';
import { MapPersonsTagRepo } from '../persons/repositories/map-persons-tags.repo';
import { PersonsRepo } from '../persons/repositories/persons.repo';
import { CompaniesRepo } from '../companies/repositories/companies.repo';
import { TasksRepo } from '../tasks/repositories/tasks.repo';
import type { DataImportWithStats } from './repositories/imports.repo';
import { ImportsRepo } from './repositories/imports.repo';

export class ImportsController extends BaseController<'data_imports', ImportsRepo> {
  private readonly personsRepo = new PersonsRepo();
  private readonly mapPersonsTagRepo = new MapPersonsTagRepo();
  private readonly mapListsPersonsRepo = new MapListsPersonsRepo();
  private readonly householdsRepo = new HouseholdRepo();
  private readonly mapHouseholdsTagsRepo = new MapHouseholdsTagsRepo();
  private readonly companiesRepo = new CompaniesRepo();
  private readonly tasksRepo = new TasksRepo();

  constructor() {
    super(new ImportsRepo());
  }

  public async list(auth: IAuthKeyPayload): Promise<ImportListItem[]> {
    const rows = await this.getRepo().getAllWithStats({ tenant_id: auth.tenant_id });
    return rows.map((row) => this.mapToListItem(row));
  }

  public async deleteImport(
    input: {
      id: string;
      deleteContacts?: boolean;
      deletePeople?: boolean;
      deleteHouseholds?: boolean;
      deleteCompanies?: boolean;
      deleteTasks?: boolean;
    },
    auth: IAuthKeyPayload,
  ): Promise<{ deleted: boolean; contactsRemoved: boolean }> {
    const stats = await this.getRepo().getOneWithStats({ tenant_id: auth.tenant_id, id: input.id });
    if (!stats) throw new NotFoundError('Import not found');

    if (stats.status === 'pending' || stats.status === 'processing') {
      throw new BadRequestError('Cannot delete an import that is still processing.');
    }

    const wantsPeopleDeletion = Boolean(input.deletePeople || input.deleteContacts);
    const wantsHouseholdDeletion = Boolean(input.deleteHouseholds);
    const wantsCompanyDeletion = Boolean(input.deleteCompanies);
    const wantsTaskDeletion = Boolean(input.deleteTasks);

    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        // 1. Delete people
        if (wantsPeopleDeletion) {
          const personIds = await this.personsRepo.getIdsByFileId(
            { tenant_id: auth.tenant_id, file_id: stats.id },
            trx,
          );
          if (personIds.length > 0) {
            await this.mapPersonsTagRepo.deleteByPersonIds({ tenant_id: auth.tenant_id, person_ids: personIds }, trx);
            await this.mapListsPersonsRepo.deleteByPersonIds({ tenant_id: auth.tenant_id, person_ids: personIds }, trx);
            await this.personsRepo.deleteMany({ tenant_id: auth.tenant_id as any, ids: personIds as any }, trx);
          }
        } else {
          await this.personsRepo.clearFileIdForImport(
            { tenant_id: auth.tenant_id, import_id: stats.id, user_id: auth.user_id },
            trx,
          );
        }

        // 2. Delete households
        if (wantsHouseholdDeletion) {
          const householdIds = await this.householdsRepo.getIdsByFileId(
            { tenant_id: auth.tenant_id, file_id: stats.id },
            trx,
          );
          if (householdIds.length > 0) {
            await this.mapHouseholdsTagsRepo.deleteByHouseholdIds(
              { tenant_id: auth.tenant_id, household_ids: householdIds },
              trx,
            );
            // Also clean up list associations before household deletion
            await trx
              .deleteFrom('map_lists_households')
              .where('tenant_id', '=', auth.tenant_id)
              .where('household_id', 'in', householdIds)
              .execute();
            await this.householdsRepo.deleteMany({ tenant_id: auth.tenant_id as any, ids: householdIds as any }, trx);
          }
        } else {
          await this.householdsRepo.clearFileIdForImport(
            { tenant_id: auth.tenant_id, import_id: stats.id, user_id: auth.user_id },
            trx,
          );
        }

        // 3. Delete companies
        if (wantsCompanyDeletion) {
          const companyIds = await this.companiesRepo.getIdsByFileId(
            { tenant_id: auth.tenant_id, file_id: stats.id },
            trx,
          );
          if (companyIds.length > 0) {
            await trx
              .updateTable('persons')
              .set({ company_id: null, updated_at: sql`now()` as any, updatedby_id: auth.user_id })
              .where('tenant_id', '=', auth.tenant_id)
              .where('company_id', 'in', companyIds)
              .execute();
            await this.companiesRepo.deleteMany({ tenant_id: auth.tenant_id as any, ids: companyIds as any }, trx);
          }
        } else {
          await this.companiesRepo.clearFileIdForImport(
            { tenant_id: auth.tenant_id, import_id: stats.id, user_id: auth.user_id },
            trx,
          );
        }

        // 4. Delete tasks
        if (wantsTaskDeletion) {
          const taskIds = await this.tasksRepo.getIdsByFileId({ tenant_id: auth.tenant_id, file_id: stats.id }, trx);
          if (taskIds.length > 0) {
            await trx
              .deleteFrom('task_subtasks')
              .where('tenant_id', '=', auth.tenant_id)
              .where('task_id', 'in', taskIds)
              .execute();
            await trx
              .deleteFrom('task_comments')
              .where('tenant_id', '=', auth.tenant_id)
              .where('task_id', 'in', taskIds)
              .execute();
            await trx
              .deleteFrom('task_attachments')
              .where('tenant_id', '=', auth.tenant_id)
              .where('task_id', 'in', taskIds)
              .execute();
            await this.tasksRepo.deleteMany({ tenant_id: auth.tenant_id as any, ids: taskIds as any }, trx);
          }
        } else {
          await this.tasksRepo.clearFileIdForImport(
            { tenant_id: auth.tenant_id, import_id: stats.id, user_id: auth.user_id },
            trx,
          );
        }

        await this.getRepo().delete({ tenant_id: auth.tenant_id as any, id: stats.id as any }, trx);
      });

    return { deleted: true, contactsRemoved: wantsPeopleDeletion };
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
      companyCount: row.company_count,
      taskCount: row.task_count,
      status: row.status,
      errorMessage: row.error_message,
      canDeleteContacts,
    };
  }
}
