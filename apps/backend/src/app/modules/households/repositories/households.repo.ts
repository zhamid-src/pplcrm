/**
 * Repository utilities for household records and related queries.
 */
import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';
import { isBlankAddress } from '../../../lib/address-normalize';

/**
 * Repository for the `households` table.
 *
 * Provides table-specific queries such as joining households with people and tags.
 */
export class HouseholdRepo extends BaseRepository<'households'> {
  /**
   * Creates a repository instance for the `households` table.
   */
  constructor() {
    super('households');
  }

  public override async addMany(
    input: { rows: OperationDataType<'households', 'insert'>[] },
    trx?: Transaction<Models>,
  ) {
    const createdRows = await super.addMany(input, trx);
    const db = trx || this.db;

    const jobs = createdRows
      .filter((row) => row && row.id && !isBlankAddress(row))
      .map((row) => ({
        tenant_id: row.tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'geocode_household',
          household_id: String(row.id),
          tenant_id: row.tenant_id,
        }),
        run_at: new Date(),
        max_attempts: 3,
      }));

    if (jobs.length > 0) {
      await db
        .insertInto('background_jobs' as any)
        .values(jobs)
        .execute();
    }

    return createdRows;
  }

  public async getIdsByFileId(
    input: { tenant_id: string; file_id: string; onlyEmpty?: boolean },
    trx?: Transaction<Models>,
  ): Promise<string[]> {
    if (!input.file_id) return [];
    let query = this.getSelect(trx)
      .select('id')
      .where('tenant_id', '=', input.tenant_id)
      .where('file_id', '=', input.file_id);

    if (input.onlyEmpty) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            eb.selectFrom('persons').select('id').whereRef('persons.household_id', '=', 'households.id').limit(1),
          ),
        ),
      );
    }

    const rows = await query.execute();
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
      } as OperationDataType<'households', 'update'>)
      .where('tenant_id', '=', input.tenant_id as any)
      .where('file_id', '=', input.import_id as any)
      .executeTakeFirst();
  }

  /**
   * Find a "blank" household for a tenant/campaign. A blank household is one with
   * no address-related fields or home_phone set (all null) and no file/notes/json.
   * Returns the first match or undefined.
   */
  public async getBlankHousehold(input: { tenant_id: string; campaign_id: string }, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('campaign_id', '=', input.campaign_id)
      .where('home_phone', 'is', null)
      .where('apt', 'is', null)
      .where('street_num', 'is', null)
      .where('street1', 'is', null)
      .where('street2', 'is', null)
      .where('city', 'is', null)
      .where('state', 'is', null)
      .where('zip', 'is', null)
      .where('country', 'is', null)
      .where('file_id', 'is', null)
      .where('notes', 'is', null)
      .where('json', 'is', null)
      .selectAll()
      .limit(1)
      .executeTakeFirst();
  }

  /**
   * Find a household by address fingerprints. Prefers full fingerprint when provided,
   * otherwise matches on street-level fingerprint.
   */
  public async findByFingerprint(
    input: { tenant_id: string; campaign_id: string; fp_street: string | null; fp_full?: string | null },
    trx?: Transaction<Models>,
  ) {
    const sel = this.getSelect(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('campaign_id', '=', input.campaign_id);

    if (input.fp_full) {
      const full = await sel.where('address_fp_full', '=', input.fp_full).selectAll().limit(1).executeTakeFirst();
      if (full) return full;
    }
    if (input.fp_street) {
      return await this.getSelect(trx)
        .where('tenant_id', '=', input.tenant_id)
        .where('campaign_id', '=', input.campaign_id)
        .where('address_fp_street', '=', input.fp_street)
        .selectAll()
        .limit(1)
        .executeTakeFirst();
    }
    return undefined;
  }

  /**
   * Get all households with person count and associated tags, supporting filter/search/pagination.
   *
   * @param input.tenant_id - The tenant ID to scope the query
   * @param input.options - Optional select/filter/pagination options
   * @param input.tags - If provided, filters households by tag name(s)
   * @param trx - Optional Kysely transaction
   * @returns Paginated list of households with person count and tags, and the total count
   */
  public async getAllWithPeopleCount(
    input: {
      tenant_id: string;
      options?: QueryParams<'households' | 'tags' | 'map_households_tags' | 'persons'> & { issues?: string[] };
      tags?: string[];
      issues?: string[];
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams & { issues?: string[]; listId?: string } = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = this.normalizeSearch(options.searchStr);
    const tags = input.tags;
    const issues = input.issues || options.issues;
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;

    // Shared where clause builder (for both queries)
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) => {
      let q = qb
        .leftJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
        .leftJoin('tags', 'tags.id', 'map_households_tags.tag_id')
        .leftJoin('tenants', 'tenants.id', 'households.tenant_id')
        .$if(!!tags?.length, (q) => q.where('tags.name', 'in', tags!).where('tags.type', '=', 'tag'))
        .$if(!!issues?.length, (q) => q.where('tags.name', 'in', issues!).where('tags.type', '=', 'issue'))
        .$if(!!options.listId, (qb) =>
          qb.where('households.id', 'in', (eb: any) =>
            eb
              .selectFrom('map_lists_households')
              .select('household_id')
              .where('list_id', '=', options.listId!)
              .where('tenant_id', '=', tenantId),
          ),
        )
        .where('households.tenant_id', '=', tenantId)
        .where((eb) =>
          eb.or([
            eb('tenants.placeholder_household_id', 'is', null),
            eb('tenants.placeholder_household_id', '!=', eb.ref('households.id')),
          ]),
        )
        .$if(!!searchStr, (qb) => {
          const text = searchStr;
          return qb.where(
            sql`(
              LOWER(households.city) LIKE ${text} OR
              LOWER(households.street1) LIKE ${text} OR
              LOWER(households.street2) LIKE ${text} OR
              LOWER(households.notes) LIKE ${text} OR
              LOWER(tags.name) LIKE ${text}
            )` as any,
          );
        });

      // Apply dynamic, operator-aware column filters
      q = this.applyColumnFilter(q, 'households.city', filterModel['city']);
      q = this.applyColumnFilter(q, 'households.state', filterModel['state']);
      q = this.applyColumnFilter(q, 'households.street1', filterModel['street1']);
      q = this.applyColumnFilter(q, 'households.street2', filterModel['street2']);
      q = this.applyCastColumnFilter(q, sql`households.street_num::text`, filterModel['street_num']);
      q = this.applyColumnFilter(q, 'households.zip', filterModel['zip']);
      q = this.applyColumnFilter(q, 'households.home_phone', filterModel['home_phone']);
      if (filterModel['tags']?.value) {
        q = q.where('tags.type', '=', 'tag');
        q = this.applyColumnFilter(q, 'tags.name', filterModel['tags']);
      }
      if (filterModel['issues']?.value) {
        q = q.where('tags.type', '=', 'issue');
        q = this.applyColumnFilter(q, 'tags.name', filterModel['issues']);
      }

      // Apply advanced query builder filters if present
      const columnMapping = {
        city: { col: 'households.city' },
        state: { col: 'households.state' },
        street1: { col: 'households.street1' },
        street2: { col: 'households.street2' },
        street_num: { col: 'households.street_num::text', isCast: true },
        zip: { col: 'households.zip' },
        home_phone: { col: 'households.home_phone' },
        tag: { col: 'tags.name' },
        tags: { col: 'tags.name' },
        issues: { col: 'tags.name' },
      };
      const advModel = options.advancedFilterModel || (options.filterModel as any)?.tags_expression;
      q = this.applyAdvancedFilters(q, advModel, columnMapping);

      return q;
    };

    // Count query
    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT households.id`).as('total')])
      .execute();

    const count = Number(countResult[0]?.['total'] || 0);

    // Data query
    const rows = await applyFilters(this.getSelect(trx))
      .select([
        'households.id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.apt',
        'households.street1',
        'households.street2',
        'households.street_num',
        'households.notes',
        'households.district',
        'households.precinct',
        'households.ward',
        'households.geocoding_status',
      ])
      .select((eb) => [
        eb
          .selectFrom('persons')
          .whereRef('persons.household_id', '=', 'households.id')
          .select(({ fn }) => [fn.count<number>('persons.id').as('persons_count')])
          .as('persons_count'),
        // is_placeholder: true only for the one household stored on the tenant row
        eb
          .case()
          .when('tenants.placeholder_household_id', '=', eb.ref('households.id'))
          .then(true)
          .else(false)
          .end()
          .as('is_placeholder'),
      ])
      .select(() => [
        sql<string[]>`coalesce(array_remove(array_agg(CASE WHEN tags.type = 'tag' THEN tags.name END), null), '{}')`.as(
          'tags',
        ),
        sql<
          string[]
        >`coalesce(array_remove(array_agg(CASE WHEN tags.type = 'issue' THEN tags.name END), null), '{}')`.as('issues'),
      ])
      .groupBy([
        'households.id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.apt',
        'households.street1',
        'households.street2',
        'households.street_num',
        'households.notes',
        'households.district',
        'households.precinct',
        'households.ward',
        'households.geocoding_status',
        'tenants.placeholder_household_id',
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => {
          let col = sort.colId;
          if (typeof col === 'string' && !col.includes('.')) {
            const hhCols = [
              'id',
              'campaign_id',
              'createdby_id',
              'file_id',
              'home_phone',
              'json',
              'notes',
              'address_fp_street',
              'address_fp_full',
              'is_placeholder',
              'district',
              'precinct',
              'ward',
              'geocoding_status',
              'tenant_id',
              'updatedby_id',
              'created_at',
              'updated_at',
              'country',
              'zip',
              'state',
              'city',
              'street1',
              'street2',
              'street_num',
              'apt',
            ];
            if (hhCols.includes(col)) {
              col = `households.${col}`;
            }
          }
          return acc.orderBy(col as any, sort.sort);
        }, qb),
      )
      .$if(typeof options.startRow === 'number' && typeof options.endRow === 'number', (qb) =>
        qb.offset(options.startRow!).limit(options.endRow! - options.startRow!),
      )
      .execute();

    return {
      rows,
      count,
    };
  }

  /**
   * Returns a Set of IDs from `candidates` that are placeholder households
   * for this tenant. Typically returns a set with 0 or 1 element.
   */
  public async getPlaceholderIds(tenant_id: string, candidates: string[]): Promise<Set<string>> {
    if (!candidates.length) return new Set();
    const result = await this.getSelect()
      .leftJoin('tenants', 'tenants.id', 'households.tenant_id')
      .where('households.tenant_id', '=', tenant_id)
      .where('households.id', 'in', candidates as any)
      .whereRef('tenants.placeholder_household_id', '=', 'households.id')
      .select('households.id')
      .execute();
    return new Set(result.map((r) => String(r.id)));
  }

  /**
   * Count the number of persons linked to a specific household for a tenant.
   */
  public async getPeopleCount(input: { tenant_id: string; id: string }) {
    const result = await this.getSelect()
      .leftJoin('persons', 'persons.household_id', 'households.id')
      .where('households.id', '=', input.id)
      .where('households.tenant_id', '=', input.tenant_id)
      .select(({ fn }) => [fn.count<number>('persons.id').as('count')])
      .executeTakeFirst();

    return Number((result as { count?: number } | undefined)?.count ?? 0);
  }

  /**
   * Get a list of all distinct tag names used in the household map table for a tenant.
   *
   * @param tenant_id - The tenant ID
   * @returns List of distinct tag names
   */
  public getDistinctTags(tenant_id: string, type: 'tag' | 'issue' = 'tag') {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.tenant_id', '=', tenant_id)
      .where('tags.type', '=', type)
      .select('tags.name')
      .distinct()
      .execute();
  }

  /**
   * Get all tags associated with a given household.
   *
   * @param id - Household ID
   * @param tenant_id - The tenant ID
   * @param type - Optional tag/issue type
   * @returns List of tag names
   */
  public getTags(id: string, tenant_id: string, type?: 'tag' | 'issue') {
    let q = this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.id', '=', id)
      .where('households.tenant_id', '=', tenant_id);
    if (type) {
      q = q.where('tags.type', '=', type);
    }
    return q.select('tags.name').execute();
  }

  /**
   * Find potential duplicates within the tenant (sharing identical full address fingerprint).
   */
  public async findPotentialDuplicates(tenant_id: string): Promise<any[]> {
    const tenantRow = await (BaseRepository as any)['_db']
      .selectFrom('tenants')
      .select('placeholder_household_id')
      .where('id', '=', tenant_id)
      .executeTakeFirst();
    const placeholderHhId = tenantRow?.placeholder_household_id;

    const duplicateAddresses = await this.getSelect()
      .select(['address_fp_full'])
      .select((eb) => [
        eb.fn.count('households.id').as('match_count'),
        eb.fn.agg<string[]>('array_agg', ['households.id']).as('ids'),
      ])
      .where('tenant_id', '=', tenant_id)
      .where('address_fp_full', 'is not', null)
      .where(sql`trim(address_fp_full)`, '!=', '')
      .$if(!!placeholderHhId, (qb) => qb.where('id', '!=', placeholderHhId!))
      .groupBy('address_fp_full')
      .having(sql`count(households.id)`, '>', 1)
      .execute();

    const hhIds = new Set<string>();
    for (const group of duplicateAddresses) {
      const ids = group.ids;
      if (Array.isArray(ids)) {
        ids.forEach((id) => hhIds.add(String(id)));
      }
    }

    if (hhIds.size === 0) return [];

    const dbRows = await this.getSelect()
      .select([
        'households.id',
        'households.street_num',
        'households.street1',
        'households.street2',
        'households.city',
        'households.state',
        'households.zip',
        'households.country',
        'households.apt',
        'households.home_phone',
        'households.notes',
        'households.created_at',
      ])
      .where('households.tenant_id', '=', tenant_id)
      .where('households.id', 'in', Array.from(hhIds))
      .execute();

    const hhMap = new Map<string, any>();
    for (const row of dbRows) {
      hhMap.set(String(row.id), {
        ...row,
        id: String(row.id),
      });
    }

    // Now fetch all persons belonging to these duplicate household IDs
    const persons = await (BaseRepository as any)['_db']
      .selectFrom('persons')
      .select(['id', 'first_name', 'last_name', 'email', 'household_id'])
      .where('tenant_id', '=', tenant_id)
      .where('household_id', 'in', Array.from(hhIds))
      .execute();

    const hhToPersons = new Map<string, any[]>();
    for (const p of persons) {
      const hhId = String(p.household_id);
      if (!hhToPersons.has(hhId)) {
        hhToPersons.set(hhId, []);
      }
      hhToPersons.get(hhId)!.push(p);
    }

    const groups: Array<{ reason: string; households: any[] }> = [];
    for (const group of duplicateAddresses) {
      const groupHouseholds = group.ids
        .map((id) => {
          const hh = hhMap.get(id);
          if (hh) {
            return {
              ...hh,
              persons: hhToPersons.get(id) || [],
            };
          }
          return null;
        })
        .filter(Boolean);

      if (groupHouseholds.length > 1) {
        const first = groupHouseholds[0];
        const addrStr = [first.street_num, first.street1, first.apt, first.city, first.state, first.zip]
          .filter(Boolean)
          .join(' ');
        groups.push({
          reason: `Matching Address: "${addrStr}"`,
          households: groupHouseholds,
        });
      }
    }
    return groups;
  }

  /**
   * Merges a source household record into a target household record in a transaction.
   */
  public async mergeHouseholds(input: { tenant_id: string; target_id: string; source_id: string; user_id: string }) {
    return this.transaction().execute(async (trx) => {
      const target = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.target_id }, trx)) as any;
      const source = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.source_id }, trx)) as any;

      if (!target || !source) {
        throw new Error('Target or Source household not found');
      }

      // 1. Merge fields (copy null/empty fields from source to target)
      const targetUpdate: Record<string, any> = {};
      const fields = [
        'apt',
        'street_num',
        'street1',
        'street2',
        'city',
        'state',
        'zip',
        'country',
        'home_phone',
        'notes',
        'file_id',
      ] as const;

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

      // 2. Transfer tags (map_households_tags)
      const targetTags = await trx
        .selectFrom('map_households_tags')
        .select('tag_id')
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.target_id)
        .execute();
      const targetTagIds = new Set(targetTags.map((t) => String(t.tag_id)));

      const sourceTags = await trx
        .selectFrom('map_households_tags')
        .select(['tag_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.source_id)
        .execute();

      for (const st of sourceTags) {
        const tagIdStr = String(st.tag_id);
        if (!targetTagIds.has(tagIdStr)) {
          await trx
            .insertInto('map_households_tags')
            .values({
              tenant_id: input.tenant_id,
              household_id: input.target_id,
              tag_id: st.tag_id,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            })
            .execute();
        }
      }
      await trx
        .deleteFrom('map_households_tags')
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.source_id)
        .execute();

      // 3. Transfer lists (map_lists_households)
      const targetLists = await trx
        .selectFrom('map_lists_households')
        .select('list_id')
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.target_id)
        .execute();
      const targetListIds = new Set(targetLists.map((l) => String(l.list_id)));

      const sourceLists = await trx
        .selectFrom('map_lists_households')
        .select(['list_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.source_id)
        .execute();

      for (const sl of sourceLists) {
        if (!targetListIds.has(String(sl.list_id))) {
          await trx
            .insertInto('map_lists_households')
            .values({
              tenant_id: input.tenant_id,
              household_id: input.target_id,
              list_id: sl.list_id as any,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            })
            .execute();
        }
      }
      await trx
        .deleteFrom('map_lists_households')
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.source_id)
        .execute();

      // 4. Reassign people (persons.household_id)
      await trx
        .updateTable('persons')
        .set({ household_id: input.target_id as any, updated_at: sql`now()`, updatedby_id: input.user_id })
        .where('tenant_id', '=', input.tenant_id)
        .where('household_id', '=', input.source_id)
        .execute();

      // 5. Delete source household
      await this.delete({ tenant_id: input.tenant_id, id: input.source_id }, trx);

      return { success: true };
    });
  }
}
