/**
 * Repository utilities for household records and related queries.
 */
import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

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
            eb
              .selectFrom('persons')
              .select('id')
              .whereRef('persons.household_id', '=', 'households.id')
              .limit(1),
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
  public async getBlankHousehold(
    input: { tenant_id: string; campaign_id: string },
    trx?: Transaction<Models>,
  ) {
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
      const full = await sel
        .where('address_fp_full', '=', input.fp_full)
        .selectAll()
        .limit(1)
        .executeTakeFirst();
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
      options?: QueryParams<'households' | 'tags' | 'map_households_tags' | 'persons'>;
      tags?: string[];
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();
    const tags = input.tags;
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;

    // Shared where clause builder (for both queries)
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) => {
      let q = qb
        .leftJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
        .leftJoin('tags', 'tags.id', 'map_households_tags.tag_id')
        .$if(!!tags?.length, (q) => q.where('tags.name', 'in', tags!))
        .where('households.tenant_id', '=', tenantId)
        .$if(!!searchStr, (qb) => {
          const text = `%${searchStr}%`;
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
      q = this.applyColumnFilter(q, 'tags.name', filterModel['tags']);

      // Apply advanced query builder filters if present
      const columnMapping = {
        city: { col: 'households.city' },
        state: { col: 'households.state' },
        street1: { col: 'households.street1' },
        street2: { col: 'households.street2' },
        street_num: { col: 'households.street_num::text', isCast: true },
        zip: { col: 'households.zip' },
        home_phone: { col: 'households.home_phone' },
        tags: { col: 'tags.name' },
      };
      q = this.applyAdvancedFilters(q, options.advancedFilterModel, columnMapping);

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
      ])
      .select((eb) => [
        eb
          .selectFrom('persons')
          .whereRef('persons.household_id', '=', 'households.id')
          .select(({ fn }) => [fn.count<number>('persons.id').as('persons_count')])
          .as('persons_count'),
      ])
      .select(({ fn }) => [fn.agg<string[]>('array_agg', ['tags.name']).as('tags')])
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
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => acc.orderBy(sort.colId as any, sort.sort), qb),
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
  public getDistinctTags(tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }

  /**
   * Get all tags associated with a given household.
   *
   * @param id - Household ID
   * @param tenant_id - The tenant ID
   * @returns List of tag names
   */
  public getTags(id: string, tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.id', '=', id)
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .execute();
  }
}
