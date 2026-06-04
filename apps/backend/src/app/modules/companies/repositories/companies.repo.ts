import { sql, Transaction } from 'kysely';
import { BaseRepository } from '../../../lib/base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

export class CompaniesRepo extends BaseRepository<'companies'> {
  constructor() {
    super('companies');
  }

  /**
   * Find potential duplicates within the tenant (sharing identical trimmed, case-insensitive company name).
   */
  public async findPotentialDuplicates(tenant_id: string): Promise<any[]> {
    const duplicateNames = await this.getSelect()
      .select([
        sql<string>`lower(trim(name))`.as('name_lower'),
      ])
      .select((eb) => [
        eb.fn.count('companies.id').as('match_count'),
        eb.fn.agg<string[]>('array_agg', ['companies.id']).as('ids'),
      ])
      .where('tenant_id', '=', tenant_id)
      .where('name', 'is not', null)
      .where(sql`trim(name)`, '!=', '')
      .groupBy(sql`lower(trim(name))`)
      .having(sql`count(companies.id)`, '>', 1)
      .execute();

    const companyIds = new Set<string>();
    for (const group of duplicateNames) {
      const ids = group.ids;
      if (Array.isArray(ids)) {
        ids.forEach((id) => companyIds.add(String(id)));
      }
    }

    if (companyIds.size === 0) return [];

    const dbRows = await this.getSelect()
      .select([
        'companies.id',
        'companies.name',
        'companies.description',
        'companies.website',
        'companies.email',
        'companies.phone',
        'companies.industry',
        'companies.notes',
        'companies.created_at',
      ])
      .where('companies.tenant_id', '=', tenant_id)
      .where('companies.id', 'in', Array.from(companyIds))
      .execute();

    const companyMap = new Map<string, any>();
    for (const row of dbRows) {
      companyMap.set(String(row.id), {
        ...row,
        id: String(row.id),
      });
    }

    // Fetch all persons associated with these duplicate companies
    const persons = await (BaseRepository as any)['_db'].selectFrom('persons')
      .select(['id', 'first_name', 'last_name', 'email', 'company_id'])
      .where('tenant_id', '=', tenant_id)
      .where('company_id', 'in', Array.from(companyIds))
      .execute();

    const companyToPersons = new Map<string, any[]>();
    for (const p of persons) {
      const compId = String(p.company_id);
      if (!companyToPersons.has(compId)) {
        companyToPersons.set(compId, []);
      }
      companyToPersons.get(compId)!.push(p);
    }

    const groups: Array<{ reason: string; companies: any[] }> = [];
    for (const group of duplicateNames) {
      const groupCompanies = group.ids.map((id) => {
        const comp = companyMap.get(id);
        if (comp) {
          return {
            ...comp,
            persons: companyToPersons.get(id) || [],
          };
        }
        return null;
      }).filter(Boolean);

      if (groupCompanies.length > 1) {
        groups.push({
          reason: `Matching Company Name: "${groupCompanies[0].name}"`,
          companies: groupCompanies,
        });
      }
    }
    return groups;
  }

  /**
   * Merges a source company record into a target company record in a transaction.
   */
  public async mergeCompanies(input: {
    tenant_id: string;
    target_id: string;
    source_id: string;
    user_id: string;
  }) {
    return this.transaction().execute(async (trx) => {
      const target = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.target_id }, trx)) as any;
      const source = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.source_id }, trx)) as any;

      if (!target || !source) {
        throw new Error('Target or Source company not found');
      }

      // 1. Merge fields (copy null/empty fields from source to target)
      const targetUpdate: Record<string, any> = {};
      const fields = [
        'name',
        'description',
        'website',
        'email',
        'phone',
        'industry',
        'notes',
      ] as const;

      for (const field of fields) {
        const targetVal = target[field];
        const sourceVal = source[field];
        if ((targetVal == null || String(targetVal).trim() === '') && (sourceVal != null && String(sourceVal).trim() !== '')) {
          targetUpdate[field] = sourceVal;
        }
      }

      if (Object.keys(targetUpdate).length > 0) {
        targetUpdate['updatedby_id'] = input.user_id;
        targetUpdate['updated_at'] = sql`now()`;
        await this.update({ tenant_id: input.tenant_id, id: input.target_id, row: targetUpdate }, trx);
      }

      // 2. Reassign people (persons.company_id)
      await trx.updateTable('persons')
        .set({ company_id: input.target_id as any, updated_at: sql`now()`, updatedby_id: input.user_id })
        .where('tenant_id', '=', input.tenant_id)
        .where('company_id', '=', input.source_id)
        .execute();

      // 3. Delete source company
      await this.delete({ tenant_id: input.tenant_id, id: input.source_id }, trx);

      return { success: true };
    });
  }

  public async getIdsByFileId(
    input: { tenant_id: string; file_id: string },
    trx?: Transaction<Models>,
  ): Promise<string[]> {
    if (!input.file_id) return [];
    const rows = await this.getSelect(trx)
      .select('id')
      .where('tenant_id', '=', input.tenant_id)
      .where('file_id', '=', input.file_id)
      .execute();
    return rows.map((row) => (row.id != null ? String(row.id) : '')).filter((id) => id.length > 0);
  }

  public async clearFileIdForImport(
    input: { tenant_id: string; import_id: string; user_id: string },
    trx?: Transaction<Models>,
  ) {
    await this.getUpdate(trx)
      .set({
        file_id: null,
        updated_at: sql`now()` as any,
        updatedby_id: input.user_id,
      } as OperationDataType<'companies', 'update'>)
      .where('tenant_id', '=', input.tenant_id as any)
      .where('file_id', '=', input.import_id as any)
      .executeTakeFirst();
  }
}
