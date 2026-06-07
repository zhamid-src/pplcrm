/**
 * Repository logic for person entities.
 */
import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';
import { HouseholdRepo } from '../../households/repositories/households.repo';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Repository for the `persons` table.
 *
 * Provides additional functionality for joining with `households`, `tags`, and `map_peoples_tags`.
 */
export class PersonsRepo extends BaseRepository<'persons'> {
  /**
   * Creates a repository instance for the `persons` table.
   */
  constructor() {
    super('persons');
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
      })
      .where('tenant_id', '=', input.tenant_id)
      .where('file_id', '=', input.import_id)
      .executeTakeFirst();
  }

  public async getByIds(input: { tenant_id: string; ids: string[]; tags?: string[] }, trx?: Transaction<Models>) {
    const ids = Array.from(new Set((input.ids ?? []).map((id) => String(id)).filter(Boolean)));
    if (!ids.length) return [];

    const tags = (input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);

    let query = this.getSelect(trx)
      .select(['persons.id', 'persons.first_name', 'persons.last_name', 'persons.email'])
      .where('persons.tenant_id', '=', input.tenant_id)
      .where('persons.id', 'in', ids);

    if (tags.length > 0) {
      query = query
        .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
        .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
        .where(sql`LOWER(tags.name)`, 'in', tags);
    }

    const rows = await query.execute();
    const map = new Map<string, { id: string; first_name: string; last_name: string; email: string | null }>();
    for (const row of rows) {
      const id = row.id != null ? String(row.id) : '';
      if (!id || map.has(id)) continue;
      map.set(id, {
        id,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        email: row.email ?? null,
      });
    }
    return Array.from(map.values());
  }

  public async getCreatedStats(input: { tenant_id: string; user_id: string }) {
    const row = await this.getSelect()
      .select(() => [sql<number>`count(*)`.as('total'), sql<Date>`max(created_at)`.as('last_created_at')])
      .where('tenant_id', '=', input.tenant_id)
      .where('createdby_id', '=', input.user_id)
      .executeTakeFirst();

    return {
      total: Number(row?.total ?? 0),
      last_created_at: row?.last_created_at ? new Date(row.last_created_at) : null,
    };
  }

  /**
   * Create a new blank household and reassign the person to it.
   * Returns the new household_id.
   */
  public async moveToNewHousehold(input: {
    tenant_id: string;
    person_id: string;
    user_id: string;
    campaign_id: string;
  }) {
    const households = new HouseholdRepo();
    return this.transaction().execute(async (trx) => {
      // Reuse existing blank household if available
      const existingBlank = await households.getBlankHousehold(
        { tenant_id: input.tenant_id, campaign_id: input.campaign_id },
        trx,
      );
      let targetId = existingBlank?.id as string | undefined;

      if (!targetId) {
        const newHousehold = await households.add(
          {
            row: {
              tenant_id: input.tenant_id,
              campaign_id: input.campaign_id,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            } as OperationDataType<'households', 'insert'>,
          },
          trx,
        );
        targetId = newHousehold?.id as string | undefined;
      }

      await this.update(
        {
          tenant_id: input.tenant_id,
          id: input.person_id,
          row: { household_id: targetId, updatedby_id: input.user_id } as OperationDataType<'persons', 'update'>,
        },
        trx,
      );

      return { household_id: targetId };
    });
  }

  /**
   * Get all people with joined household address and associated tags.
   *
   * @param input.tenant_id - The tenant ID to scope the query
   * @param input.options - Optional select/filter/pagination options
   * @param input.tags - If provided, filters people by tag name(s)
   * @param trx - Optional Kysely transaction
   * @returns A list of people with household address and tags
   */
  public async getAllWithAddress(
    input: {
      tenant_id: string;
      options?: QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'> & { issues?: string[] };
      tags?: string[];
      issues?: string[];
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams & { issues?: string[] } = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = this.normalizeSearch(options.searchStr);
    const tags = input.tags;
    const issues = input.issues || options.issues;
    const filterModel = (options.filterModel ?? {}) as Record<string, any>;

    // Shared where clause builder
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) => {
      let q = qb
        .leftJoin('households', 'persons.household_id', 'households.id')
        .leftJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
        .leftJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
        .leftJoin('companies', 'persons.company_id', 'companies.id')
        .leftJoin('tenants', 'tenants.id', 'persons.tenant_id')
        .where('households.tenant_id', '=', tenantId)
        .$if(!!tags?.length, (q) => q.where('tags.name', 'in', tags!).where('tags.type', '=', 'tag'))
        .$if(!!issues?.length, (q) => q.where('tags.name', 'in', issues!).where('tags.type', '=', 'issue'))
        .$if(!!searchStr, (qb) => {
          const text = searchStr;
          return qb.where(
            sql<boolean>`(
            LOWER(persons.first_name) LIKE ${text} OR
            LOWER(persons.last_name) LIKE ${text} OR
            LOWER(persons.email) LIKE ${text} OR
            LOWER(persons.mobile) LIKE ${text} OR
            LOWER(households.city) LIKE ${text} OR
            LOWER(households.street1) LIKE ${text} OR
            LOWER(companies.name) LIKE ${text} OR
            LOWER(tags.name) LIKE ${text}
          )`,
          );
        });

      // Apply dynamic, operator-aware column filters
      q = this.applyColumnFilter(q, 'persons.first_name', filterModel['first_name']);
      q = this.applyColumnFilter(q, 'persons.last_name', filterModel['last_name']);
      q = this.applyColumnFilter(q, 'persons.email', filterModel['email']);
      q = this.applyColumnFilter(q, 'persons.mobile', filterModel['mobile']);
      q = this.applyColumnFilter(q, 'households.city', filterModel['city']);
      q = this.applyColumnFilter(q, 'households.state', filterModel['state']);
      q = this.applyColumnFilter(q, 'households.street1', filterModel['street1']);
      q = this.applyCastColumnFilter(q, sql`households.street_num::text`, filterModel['street_num']);
      q = this.applyColumnFilter(q, 'households.zip', filterModel['zip']);
      if (filterModel['tags']?.value) {
        q = q.where('tags.type', '=', 'tag');
        q = this.applyColumnFilter(q, 'tags.name', filterModel['tags']);
      }
      if (filterModel['issues']?.value) {
        q = q.where('tags.type', '=', 'issue');
        q = this.applyColumnFilter(q, 'tags.name', filterModel['issues']);
      }
      q = this.applyColumnFilter(q, 'companies.name', filterModel['company_name']);

      // Apply advanced query builder filters if present
      const columnMapping = {
        first_name: { col: 'persons.first_name' },
        last_name: { col: 'persons.last_name' },
        email: { col: 'persons.email' },
        mobile: { col: 'persons.mobile' },
        city: { col: 'households.city' },
        state: { col: 'households.state' },
        street1: { col: 'households.street1' },
        street_num: { col: 'households.street_num::text', isCast: true },
        zip: { col: 'households.zip' },
        tag: { col: 'tags.name' },
        tags: { col: 'tags.name' },
        issues: { col: 'tags.name' },
        company_name: { col: 'companies.name' },
      };
      const advModel = options.advancedFilterModel || (options.filterModel as any)?.tags_expression;
      q = this.applyAdvancedFilters(q, advModel, columnMapping);

      return q;
    };

    // Count query
    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT persons.id`).as('total')])
      .execute();

    const count = Number(countResult[0]?.['total'] || 0);

    // Data query
    const rows = await applyFilters(this.getSelect(trx))
      .select((eb) => [
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        'persons.household_id',
        'persons.company_id',
        'companies.name as company_name',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.street1',
        'households.street2',
        'households.street_num',
        'households.apt',
        eb
          .case()
          .when('tenants.placeholder_household_id', '=', eb.ref('persons.household_id'))
          .then(true)
          .else(false)
          .end()
          .as('household_is_placeholder'),
        sql<string[]>`coalesce(array_remove(array_agg(CASE WHEN tags.type = 'tag' THEN tags.name END), null), '{}')`.as(
          'tags',
        ),
        sql<
          string[]
        >`coalesce(array_remove(array_agg(CASE WHEN tags.type = 'issue' THEN tags.name END), null), '{}')`.as('issues'),
      ])
      .groupBy([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        'persons.household_id',
        'persons.company_id',
        'companies.name',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.street1',
        'households.street2',
        'households.street_num',
        'households.apt',
        'tenants.placeholder_household_id',
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => {
          let col = sort.colId;
          if (typeof col === 'string' && !col.includes('.')) {
            const personsCols = [
              'id',
              'first_name',
              'last_name',
              'email',
              'mobile',
              'notes',
              'household_id',
              'company_id',
              'created_at',
              'updated_at',
              'tenant_id',
              'createdby_id',
              'updatedby_id',
            ];
            if (personsCols.includes(col)) {
              col = `persons.${col}`;
            } else {
              const hhCols = [
                'country',
                'zip',
                'state',
                'home_phone',
                'city',
                'street1',
                'street2',
                'street_num',
                'apt',
              ];
              if (hhCols.includes(col)) {
                col = `households.${col}`;
              } else if (col === 'company_name') {
                col = `companies.name`;
              }
            }
          }
          return acc.orderBy(col as any, sort.sort);
        }, qb),
      )
      .$if(typeof options.startRow === 'number' && typeof options.endRow === 'number', (qb) =>
        qb.offset(options.startRow!).limit(options.endRow! - options.startRow!),
      )
      .execute();

    return { count, rows };
  }

  /**
   * Get all people belonging to a specific household.
   *
   * @param input.id - Household ID to filter by
   * @param input.tenant_id - Tenant ID to scope the query
   * @param input.options - Optional select/pagination/sort settings
   * @param trx - Optional transaction
   * @returns A list of people in the specified household
   */
  public getByHouseholdId(
    input: { id: string; tenant_id: string; options: QueryParams<'persons'> },
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(input.options, trx)
      .where('household_id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .execute();
  }

  /**
   * Get all people belonging to a specific company.
   */
  public getByCompanyId(
    input: { id: string; tenant_id: string; options: QueryParams<'persons'> },
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(input.options, trx)
      .where('company_id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .execute();
  }

  /**
   * Get all unique tag names assigned to people in the tenant.
   *
   * @param tenant_id - The tenant ID
   * @returns A list of unique tag names
   */
  public getDistinctTags(tenant_id: string, type: 'tag' | 'issue' = 'tag') {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.tenant_id', '=', tenant_id)
      .where('tags.type', '=', type)
      .select('tags.name')
      .distinct()
      .execute();
  }

  /**
   * Get all tags associated with a specific person.
   *
   * @param input.id - Person ID
   * @param input.tenant_id - Tenant ID
   * @param input.type - Optional tag/issue type
   * @returns List of tag names assigned to the person
   */
  public getTags(input: { id: string; tenant_id: string; type?: 'tag' | 'issue' }) {
    let q = this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.id', '=', input.id)
      .where('persons.tenant_id', '=', input.tenant_id);
    if (input.type) {
      q = q.where('tags.type', '=', input.type);
    }
    return q.select('tags.name').execute();
  }
  /**
   * Find a person by email address (case-insensitive) within a tenant.
   * Returns minimal id/email fields; used for uniqueness checks.
   */
  public async findByEmail(input: { tenant_id: string; email: string }) {
    return this.getSelect()
      .select(['id', 'email'])
      .where('tenant_id', '=', input.tenant_id)
      .where(sql`lower(email)`, '=', input.email.trim().toLowerCase())
      .executeTakeFirst();
  }

  /**
   * Find potential duplicates within the tenant (querying pre-computed potential_duplicates table).
   */
  public async findPotentialDuplicates(tenant_id: string): Promise<any[]> {
    const rows = await this.db
      .selectFrom('potential_duplicates')
      .innerJoin('persons', 'potential_duplicates.person_id', 'persons.id')
      .select([
        'potential_duplicates.group_key',
        'potential_duplicates.reason',
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.home_phone',
        'persons.notes',
        'persons.company_id',
        'persons.household_id',
        'persons.created_at',
      ])
      .where('potential_duplicates.tenant_id', '=', tenant_id)
      .execute();

    const groupsMap = new Map<string, { reason: string; persons: any[] }>();
    for (const row of rows) {
      const groupKey = row.group_key;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          reason: row.reason,
          persons: [],
        });
      }
      groupsMap.get(groupKey)!.persons.push({
        ...row,
        id: String(row.id),
      });
    }

    return Array.from(groupsMap.values());
  }

  /**
   * Helper to queue duplicates maintenance background job.
   */
  public async queueDuplicatesJob(
    tenant_id: string,
    person_ids: string[],
    group_keys: string[] = [],
    trx?: Transaction<Models>,
  ): Promise<void> {
    const db = trx || this.db;
    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'potential_duplicates_maintenance',
          tenant_id,
          person_ids,
          group_keys,
        }),
        run_at: new Date(),
        max_attempts: 3,
      })
      .execute();
  }

  /**
   * Merges a source person record into a target person record in a transaction.
   */
  public async mergePersons(input: { tenant_id: string; target_id: string; source_id: string; user_id: string }) {
    return this.transaction().execute(async (trx) => {
      const target = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.target_id }, trx)) as any;
      const source = (await this.getOneBy('id', { tenant_id: input.tenant_id, value: input.source_id }, trx)) as any;

      if (!target || !source) {
        throw new Error('Target or Source person not found');
      }

      // 1. Merge fields (copy null/empty fields from source to target)
      const targetUpdate: Record<string, any> = {};
      const fields = [
        'first_name',
        'middle_names',
        'last_name',
        'email',
        'email2',
        'mobile',
        'home_phone',
        'notes',
        'company_id',
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

      // 2. Transfer tags (map_peoples_tags)
      const targetTags = await trx
        .selectFrom('map_peoples_tags')
        .select('tag_id')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.target_id)
        .execute();
      const targetTagIds = new Set(targetTags.map((t) => String(t.tag_id)));

      const sourceTags = await trx
        .selectFrom('map_peoples_tags')
        .select(['tag_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();

      for (const st of sourceTags) {
        const tagIdStr = String(st.tag_id);
        if (!targetTagIds.has(tagIdStr)) {
          await trx
            .insertInto('map_peoples_tags')
            .values({
              tenant_id: input.tenant_id,
              person_id: input.target_id,
              tag_id: st.tag_id,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            })
            .execute();
        }
      }
      await trx
        .deleteFrom('map_peoples_tags')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();

      // 3. Transfer lists (map_lists_persons)
      const targetLists = await trx
        .selectFrom('map_lists_persons')
        .select('list_id')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.target_id)
        .execute();
      const targetListIds = new Set(targetLists.map((l) => String(l.list_id)));

      const sourceLists = await trx
        .selectFrom('map_lists_persons')
        .select(['list_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();

      for (const sl of sourceLists) {
        if (!targetListIds.has(String(sl.list_id))) {
          await trx
            .insertInto('map_lists_persons')
            .values({
              tenant_id: input.tenant_id,
              person_id: input.target_id,
              list_id: sl.list_id as any,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            })
            .execute();
        }
      }
      await trx
        .deleteFrom('map_lists_persons')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();

      // 4. Transfer teams (map_teams_persons)
      const targetTeams = await trx
        .selectFrom('map_teams_persons')
        .select('team_id')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.target_id)
        .execute();
      const targetTeamIds = new Set(targetTeams.map((t) => String(t.team_id)));

      const sourceTeams = await trx
        .selectFrom('map_teams_persons')
        .select(['team_id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();

      for (const st of sourceTeams) {
        if (!targetTeamIds.has(String(st.team_id))) {
          await trx
            .insertInto('map_teams_persons')
            .values({
              tenant_id: input.tenant_id,
              person_id: input.target_id,
              team_id: st.team_id as any,
              createdby_id: input.user_id,
              updatedby_id: input.user_id,
            })
            .execute();
        }
      }
      await trx
        .deleteFrom('map_teams_persons')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();

      // 5. Reassign captaincy if source was captain of any team
      await trx
        .updateTable('teams')
        .set({ team_captain_id: input.target_id as any, updated_at: sql`now()`, updatedby_id: input.user_id })
        .where('tenant_id', '=', input.tenant_id)
        .where('team_captain_id', '=', input.source_id)
        .execute();

      // Get old group keys of source before deleting them
      const oldSourceKeys = await trx
        .selectFrom('potential_duplicates')
        .select('group_key')
        .where('tenant_id', '=', input.tenant_id)
        .where('person_id', '=', input.source_id)
        .execute();
      const sourceKeys = oldSourceKeys.map((r) => r.group_key);

      // 6. Delete source person
      await this.delete({ tenant_id: input.tenant_id, id: input.source_id }, trx);

      // 7. Clean up empty household if source's household is now empty
      const sourceHhId = source.household_id;
      if (sourceHhId && sourceHhId !== target.household_id) {
        const remainingHhMembers = await trx
          .selectFrom('persons')
          .select('id')
          .where('tenant_id', '=', input.tenant_id)
          .where('household_id', '=', sourceHhId)
          .execute();
        if (remainingHhMembers.length === 0) {
          await trx
            .deleteFrom('households')
            .where('tenant_id', '=', input.tenant_id)
            .where('id', '=', sourceHhId)
            .execute();
        }
      }

      // 8. Queue duplicates maintenance job
      await this.queueDuplicatesJob(input.tenant_id, [input.target_id], sourceKeys, trx);

      return { success: true };
    });
  }
}
