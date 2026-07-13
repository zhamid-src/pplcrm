import type { Selectable, Transaction } from 'kysely';
import { sql } from 'kysely';
import type { Models, OperationDataType, TypeTenantId } from '../../../../../../../libs/common/src/lib/kysely.models';
import { BaseRepository } from '../../../lib/base.repo';

export class CompaniesRepo extends BaseRepository<'companies'> {
  constructor() {
    super('companies');
  }

  /** Same shape as web-forms slugExists — used by the shared uniqueSlug helper (lib/slug.ts). */
  public async slugExists(tenant_id: string, slug: string, excludeId?: string): Promise<boolean> {
    let query = this.getSelect().select('id').where('tenant_id', '=', tenant_id).where('slug', '=', slug);
    if (excludeId) {
      query = query.where('id', '!=', excludeId);
    }
    const row = await query.limit(1).executeTakeFirst();
    return !!row;
  }

  /**
   * Case-insensitive check for an existing company of the same name in the tenant.
   * Powers the "a company by that name already exists" hint on the add/edit form.
   * `excludeId` lets an edit ignore the record being edited.
   */
  public async nameExists(tenant_id: string, name: string, excludeId?: string): Promise<boolean> {
    let query = this.getSelect()
      .select('id')
      .where('tenant_id', '=', tenant_id)
      .where(sql<boolean>`lower(name) = lower(${name})`);
    if (excludeId) {
      query = query.where('id', '!=', excludeId);
    }
    const row = await query.limit(1).executeTakeFirst();
    return !!row;
  }

  /** Tenant-scoped slug resolution for /companies/:slug URLs (spec §1). */
  public getOneBySlug(input: { tenant_id: string; slug: string }) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', input.tenant_id)
      .where('slug', '=', input.slug)
      .executeTakeFirst();
  }

  /**
   * Grid feed for the Companies list. Adds a per-company employee count (`persons_count`)
   * on top of the base column projection so the grid's "People" column can render
   * "N people". `persons.company_id` is the employer link (§7). The subquery is exposed
   * as a real SELECT alias so the grid can also sort by it. Count/pagination behaviour is
   * otherwise identical to the base implementation.
   */
  public override async getAllWithCounts(
    input: { tenant_id: TypeTenantId<'companies'>; options?: any },
    trx?: Transaction<Models>,
  ): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const tenant_id = input.tenant_id;
    const [rows, count] = await Promise.all([
      this.getSelectWithColumns(input.options, trx)
        .where('tenant_id', '=', tenant_id)
        .select((eb) => [
          eb
            .selectFrom('persons')
            .whereRef('persons.company_id', '=', 'companies.id')
            .where('persons.tenant_id', '=', tenant_id)
            .select(({ fn }) => fn.count<number>('persons.id').as('persons_count'))
            .as('persons_count'),
        ])
        .execute(),
      this.count(tenant_id, trx),
    ]);
    return { rows: rows as Record<string, unknown>[], count };
  }

  public async getDuplicateCount(tenant_id: string): Promise<number> {
    // Note: tenant ID is taken in the subquery
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
    return Number(countResult?.total ?? 0);
  }

  public async getPotentialDuplicates(
    tenant_id: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<{ groups: any[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;

    // Note: tenant ID is taken in the subquery
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
    const total = Number(countResult?.total ?? 0);

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

    const persons = await this.db
      .selectFrom('persons')
      .select(['id', 'first_name', 'last_name', 'email', 'company_id'])
      .where('tenant_id', '=', tenant_id)
      .where('company_id', 'in', companyIds)
      .execute();

    const companyToPersons = new Map<string, any[]>();
    for (const p of persons) {
      const compId = String(p.company_id);
      let companyPersons = companyToPersons.get(compId);
      if (!companyPersons) {
        companyPersons = [];
        companyToPersons.set(compId, companyPersons);
      }
      companyPersons.push(p);
    }

    const groupsMap = new Map<string, { reason: string; companies: any[] }>();
    for (const row of rows) {
      const groupKey = row.group_key;
      let group = groupsMap.get(groupKey);
      if (!group) {
        group = {
          reason: row.reason,
          companies: [],
        };
        groupsMap.set(groupKey, group);
      }
      group.companies.push({
        ...row,
        id: String(row.id),
        persons: companyToPersons.get(String(row.id)) || [],
      });
    }

    const sortedGroups = groupKeys
      .map((key) => {
        const group = groupsMap.get(key);
        return group ? { ...group, group_key: key } : undefined;
      })
      .filter((g): g is NonNullable<typeof g> => !!(g && g.companies.length > 1));

    return { groups: sortedGroups, total };
  }

  public async mergeCompanies(input: { tenant_id: string; target_id: string; source_id: string; user_id: string }) {
    return this.transaction().execute(async (trx) => {
      const target = (await this.getOneBy(
        'id',
        { tenant_id: input.tenant_id as TypeTenantId<'companies'>, value: input.target_id },
        trx,
      )) as Selectable<Models['companies']>;
      const source = (await this.getOneBy(
        'id',
        { tenant_id: input.tenant_id as TypeTenantId<'companies'>, value: input.source_id },
        trx,
      )) as Selectable<Models['companies']>;

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
        .set({ company_id: input.target_id, updated_at: sql`now()`, updatedby_id: input.user_id })
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
        updated_at: sql`now()`,
        updatedby_id: input.user_id,
      } as unknown as OperationDataType<'companies', 'update'>)
      .where('tenant_id', '=', input.tenant_id)
      .where('file_id', '=', input.import_id)
      .executeTakeFirst();
  }
}
