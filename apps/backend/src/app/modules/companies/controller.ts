import { BaseController } from '../../lib/base.controller';
import { CompaniesRepo } from './repositories/companies.repo';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src/lib/auth';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { ImportsRepo } from '../imports/repositories/imports.repo';
import { StorageService } from '../../lib/storage.service';
import { TRPCError } from '@trpc/server';

export class CompaniesController extends BaseController<'companies', CompaniesRepo> {
  constructor() {
    super(new CompaniesRepo());
  }

  public override async getOneById(input: { tenant_id: string; id: string }): Promise<any> {
    const company = (await super.getOneById(input)) as any;
    if (company) {
      let currentJson: any = {};
      if (company.json) {
        currentJson = typeof company.json === 'string' ? JSON.parse(company.json) : company.json;
      }
      if (!currentJson || !currentJson.google_enriched) {
        await this.getRepo()
          .db.insertInto('background_jobs' as any)
          .values({
            tenant_id: input.tenant_id,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'enrich_company_google',
              company_id: String(company.id),
              tenant_id: String(input.tenant_id),
            }),
            run_at: new Date(),
            max_attempts: 3,
          } as any)
          .execute()
          .catch((err) => console.error('Failed to queue google enrichment job on getOneById:', err));
      }
    }
    return company;
  }

  public addCompany(payload: any, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description ?? null,
      website: payload.website ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      industry: payload.industry ?? null,
      notes: payload.notes ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'companies', 'insert'>;
    return this.add(row);
  }

  public updateCompany(id: string, row: any, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = {
      ...row,
      updatedby_id: auth.user_id,
    } as OperationDataType<'companies', 'update'>;
    return this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });
  }

  public async getAllCompanies(auth: IAuthKeyPayload, options?: any) {
    return this.getAllWithCounts(auth.tenant_id, options);
  }

  private readonly importsRepo = new ImportsRepo();
  private readonly storageService = new StorageService();

  public async getPotentialDuplicates(auth: IAuthKeyPayload, options?: { page?: number; pageSize?: number }) {
    return this.getRepo().getPotentialDuplicates(auth.tenant_id, options);
  }

  public async mergeCompanies(target_id: string, source_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().mergeCompanies({
      tenant_id: auth.tenant_id,
      target_id,
      source_id,
      user_id: auth.user_id,
    });
  }

  public async importRows(
    input: {
      rows: Array<{
        name: string;
        description?: string | null;
        website?: string | null;
        email?: string | null;
        phone?: string | null;
        industry?: string | null;
        notes?: string | null;
      }>;
      skipped?: number;
      file_name?: string | null;
    },
    auth: IAuthKeyPayload,
  ) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const autoTag = `Imported-Companies-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    const skippedFromClient = Math.max(0, Math.floor(input.skipped ?? 0));
    const requestedFileName = (input.file_name ?? '').trim();
    const baseFileName = requestedFileName || `${autoTag}.csv`;
    const totalRows = input.rows.length + skippedFromClient;

    const importRow = {
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      file_name: baseFileName,
      source: 'companies',
      tag_name: null,
      tag_id: null,
      row_count: totalRows,
      inserted_count: 0,
      error_count: 0,
      skipped_count: skippedFromClient,
      households_created: 0,
      status: 'pending',
      metadata: null,
      processed_at: now,
    } as any;

    const savedImport = await this.importsRepo.add({ row: importRow });
    if (!savedImport || !savedImport.id) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create data import record',
      });
    }

    const importRecordId = String(savedImport.id);
    const storageKey = `imports/payloads/${auth.tenant_id}/${importRecordId}.json`;

    try {
      const payloadBuffer = Buffer.from(JSON.stringify(input.rows), 'utf8');
      await this.storageService.upload(storageKey, payloadBuffer, 'application/json');
    } catch (err) {
      console.error('Failed to upload import payload to storage', err);
      await this.importsRepo.delete({ tenant_id: auth.tenant_id as any, id: importRecordId as any });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to store import payload on server storage',
      });
    }

    await this.importsRepo.update({
      tenant_id: auth.tenant_id as any,
      id: importRecordId as any,
      row: {
        metadata: JSON.stringify({ storage_key: storageKey }),
      } as any,
    });

    await this.importsRepo.db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: auth.tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          import_id: importRecordId,
          storage_key: storageKey,
          skipped: skippedFromClient,
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          file_name: baseFileName,
          source: 'companies',
        }),
        run_at: new Date(),
      } as any)
      .execute();

    return {
      inserted: 0,
      errors: 0,
      skipped: skippedFromClient,
      file_name: baseFileName,
      import_id: importRecordId,
      tenant_id: auth.tenant_id,
      status: 'pending',
    } as any;
  }

  public async processImportRows(import_id: string, tenant_id: string, user_id: string, skipped: number, rows: any[]) {
    const results = { inserted: 0, errors: 0, skipped: 0 };
    const errorMessages: string[] = [];

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      // 1. Filter valid rows upfront
      const validRows: any[] = [];
      for (const raw of chunk) {
        if (!raw.name || !raw.name.trim()) {
          results.skipped += 1;
        } else {
          validRows.push(raw);
        }
      }

      if (validRows.length > 0) {
        try {
          // 2. Batch insert all valid company rows in one statement
          const companyRows = validRows.map((raw) => ({
            tenant_id,
            createdby_id: user_id,
            updatedby_id: user_id,
            name: raw.name.trim(),
            description: raw.description ?? null,
            website: raw.website ?? null,
            email: raw.email ?? null,
            phone: raw.phone ?? null,
            industry: raw.industry ?? null,
            notes: raw.notes ?? null,
            file_id: import_id,
          }));
          await this.getRepo()
            .transaction()
            .execute(async (trx) => {
              await (trx as any).insertInto('companies').values(companyRows).execute();
            });
          results.inserted += validRows.length;
        } catch (err: any) {
          results.errors += validRows.length;
          errorMessages.push(err?.message || String(err));
        }
      }

      await this.importsRepo.update({
        tenant_id: tenant_id as any,
        id: import_id as any,
        row: {
          inserted_count: results.inserted,
          error_count: results.errors,
          skipped_count: skipped + results.skipped,
          updatedby_id: user_id,
          updated_at: new Date(),
        } as any,
      });
    }

    return {
      inserted: results.inserted,
      errors: results.errors,
      skipped: skipped + results.skipped,
      errorMessages,
    };
  }
}
