/**
 * Repository for tag records and their associations.
 */
import { OperandValueExpressionOrList, SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models, TypeId, TypeTenantId } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `tags` table and related mapping tables.
 */
export class TagsRepo extends BaseRepository<'tags'> {
  /**
   * Creates a repository instance for the `tags` table.
   */
  constructor() {
    super('tags');
  }

  /**
   * Deletes tags by ID, along with their associated mapping records.
   * Only tags marked as deletable are removed.
   *
   * @param input.tenant_id - Tenant scope
   * @param input.ids - Tag IDs to delete
   * @returns `true` if deletion query ran successfully
   */
  public override async deleteMany(input: { tenant_id: TypeTenantId<'tags'>; ids: TypeId<'tags'>[] }) {
    return await this.transaction().execute(async (trx) => {
      const tag_ids = input.ids as OperandValueExpressionOrList<Models, 'tags', 'id'>;

      await trx
        .deleteFrom('map_households_tags')
        .where('tag_id', 'in', tag_ids as TypeId<'map_households_tags'>)
        .execute();

      await trx
        .deleteFrom('map_peoples_tags')
        .where('tag_id', 'in', tag_ids as TypeId<'map_peoples_tags'>)
        .execute();

      const result = await trx
        .deleteFrom(this.table)
        .where('id', 'in', tag_ids)
        .where('deletable', '=', true)
        .executeTakeFirst();

      return Number(result?.numDeletedRows ?? 0) > 0;
    });
  }

  /**
   * Retrieves all tags for a tenant, including usage counts from both people and households.
   *
   * @param input.tenant_id - Tenant scope
   * @param trx - Optional Kysely transaction
   * @returns A list of tags with usage statistics
   */
  public async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags' | 'map_households_tags'>;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;

    // Pagination defaults
    const startRow = typeof options.startRow === 'number' ? options.startRow : 0;
    const endRow = typeof options.endRow === 'number' && options.endRow > startRow ? options.endRow : startRow + 100;

    // Shared filter/search logic for both queries
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .leftJoin('map_peoples_tags', 'map_peoples_tags.tag_id', 'tags.id')
        .leftJoin('map_households_tags', 'map_households_tags.tag_id', 'tags.id')
        .where('tags.tenant_id', '=', tenantId)
        .$if(!!searchStr, (qb) => {
          const text = `%${searchStr}%`;
          return qb.where(
            sql`(
            LOWER(tags.name) LIKE ${text} OR
            LOWER(tags.description) LIKE ${text}
          )` as any,
          );
        })
        .$if(!!filterModel['name']?.value, (q) => q.where('tags.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel['description']?.value, (q) =>
          q.where('tags.description', 'ilike', `%${filterModel['description'].value}%`),
        )
        .$if(!!filterModel['deletable']?.value || typeof filterModel['deletable'] === 'string', (q) => {
          const raw = (filterModel['deletable']?.value ?? filterModel['deletable']) as any;
          const v = String(raw || '').trim().toLowerCase();
          if (v === 'true' || v === '1' || v === 'yes') return q.where('tags.deletable', '=', true);
          if (v === 'false' || v === '0' || v === 'no') return q.where('tags.deletable', '=', false);
          return q;
        });

    // Count query (with filters/search)
    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT tags.id`).as('total')])
      .execute();

    const count = Number(countResult[0]?.['total'] || 0);

    // Data query (with filters/search, sorting, pagination)
    const rows = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [
        'tags.id',
        'tags.name',
        'tags.description',
        'tags.deletable',
        fn.count('map_peoples_tags.person_id').as('use_count_people'),
        fn.count('map_households_tags.household_id').as('use_count_households'),
      ])
      .groupBy(['tags.id', 'tags.name', 'tags.description', 'tags.deletable'])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => acc.orderBy(sort.colId as any, sort.sort), qb),
      )
      .offset(startRow)
      .limit(endRow - startRow)
      .execute();

    return {
      rows,
      count,
    };
  }

  /**
   * Returns the ID of a tag by its name and tenant.
   *
   * @param input.name - Tag name to match
   * @param input.tenant_id - Tenant scope
   * @param trx - Optional Kysely transaction
   * @returns Tag row containing only the `id`, or undefined if not found
   */
  public getIdByName(input: { tenant_id: string; name: string }, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select('id')
      .where('name', '=', input.name)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();
  }
}
