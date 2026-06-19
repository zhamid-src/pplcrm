import { sql, Transaction } from 'kysely';
import { BaseRepository } from '../../../lib/base.repo';
import { Models, OperationDataType } from '../../../../../../../libs/common/src/lib/kysely.models';

export class CompaniesRepo extends BaseRepository<'companies'> {
  constructor() {
    super('companies');
  }

  public async getDuplicateCount(tenant_id: string): Promise<number> {
    // eslint-disable-next-line local/no-unscoped-db-query
    const countResult = await this.db
      .selectFrom((qb) =>
        qb
          .selectFrom('potential_duplicates')
          .innerJoin('companies', 'potential_duplicates.company_id', 'companies.id')
          .select('potential_duplicates.group_key')
          .where('potential_duplicates.tenant_id', '=', tenant_id)
          .groupBy('potential_duplicates.group_key')
          .having(sql`count(potential_duplicates.id)`, '>', 1)
          .as('sub'),
      )
      .select([sql<number>`count(group_key)`.as('total')])
      .executeTakeFirst();
    return Number((countResult as any)?.total || 0);
  }

  /**
   * Find potential duplicates within the tenant (sharing identical trimmed, case-insensitive company name).
   */
  public async getPotentialDuplicates(
    tenant_id: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<{ groups: any[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;

    // eslint-disable-next-line local/no-unscoped-db-query
    const countResult = await this.db
      .selectFrom((qb) =>
        qb
          .selectFrom('potential_duplicates')
          .innerJoin('companies', 'potential_duplicates.company_id', 'companies.id')
          .select('potential_duplicates.group_key')
          .where('potential_duplicates.tenant_id', '=', tenant_id)
          .groupBy('potential_duplicates.group_key')
          .having(sql`count(potential_duplicates.id)`, '>', 1)
          .as('sub'),
      )
      .select([sql<number>`count(group_key)`.as('total')])
      .executeTakeFirst();
    const total = Number((countResult as any)?.total || 0);

    if (total === 0) {
      return { groups: [], total: 0 };
    }

    const keysRows = await this.db
      .selectFrom('potential_duplicates')
      .innerJoin('companies', 'potential_duplicates.company_id', 'companies.id')
      .select('potential_duplicates.group_key')
      .where('potential_duplicates.tenant_id', '=', tenant_id)
      .groupBy('potential_duplicates.group_key')
      .having(sql`count(potential_duplicates.id)`, '>', 1)
      .orderBy(sql`min(potential_duplicates.id)`)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute();

    const groupKeys = keysRows.map((r) => r.group_key);

    if (groupKeys.length === 0) {
      return { groups: [], total };
    }

    const rows = await this.db
      .selectFrom('potential_duplicates')
      .innerJoin('companies', 'potential_duplicates.company_id', 'companies.id')
      .select([
        'potential_duplicates.group_key',
        'potential_duplicates.reason',
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
      .where('potential_duplicates.tenant_id', '=', tenant_id)
      .where('potential_duplicates.group_key', 'in', groupKeys)
      .execute();

    const companyIds = rows.map((r) => String(r.id));
    if (companyIds.length === 0) {
      return { groups: [], total };
    }

    const persons = await (BaseRepository as any)['_db']
      .selectFrom('persons')
      .select(['id', 'first_name', 'last_name', 'email', 'company_id'])
      .where('tenant_id', '=', tenant_id)
      .where('company_id', 'in', companyIds)
      .execute();

    const companyToPersons = new Map<string, any[]>();
    for (const p of persons) {
      const compId = String(p.company_id);
      if (!companyToPersons.has(compId)) {
        companyToPersons.set(compId, []);
      }
      companyToPersons.get(compId)!.push(p);
    }

    const groupsMap = new Map<string, { reason: string; companies: any[] }>();
    for (const row of rows) {
      const groupKey = row.group_key;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          reason: row.reason,
          companies: [],
        });
      }
      groupsMap.get(groupKey)!.companies.push({
        ...row,
        id: String(row.id),
        persons: companyToPersons.get(String(row.id)) || [],
      });
    }

    const sortedGroups = groupKeys.map((key) => groupsMap.get(key)).filter((g) => g && g.companies.length > 1) as any[];

    return { groups: sortedGroups, total };
  }

  /**
   * Merges a source company record into a target company record in a transaction.
   */
  public async mergeCompanies(input: { tenant_id: string; target_id: string; source_id: string; user_id: string }) {
    return this.transaction().execute(async (trx) => {
      const target = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.target_id }, trx)) as any;
      const source = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.source_id }, trx)) as any;

      if (!target || !source) {
        throw new Error('Target or Source company not found');
      }

      // 1. Merge fields (copy null/empty fields from source to target)
      const targetUpdate: Record<string, any> = {};
      const fields = ['name', 'description', 'website', 'email', 'phone', 'industry', 'notes'] as const;

      for (const field of fields) {
        const targetVal = target[field];
        const sourceVal = source[field];
        if (
          (targetVal == null || String(targetVal).trim() === '') &&
          sourceVal != null &&
          String(sourceVal).trim() !== ''
        ) {
          targetUpdate[field] = sourceVal;
        }
      }

      if (Object.keys(targetUpdate).length > 0) {
        targetUpdate['updatedby_id'] = input.user_id;
        targetUpdate['updated_at'] = sql`now()`;
        await this.update({ tenant_id: input.tenant_id, id: input.target_id, row: targetUpdate }, trx);
      }

      // 2. Reassign people (persons.company_id)
      await trx
        .updateTable('persons')
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
