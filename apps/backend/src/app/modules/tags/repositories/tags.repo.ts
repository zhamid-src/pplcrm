import type { ReferenceExpression, SelectQueryBuilder, Transaction, Selectable } from 'kysely';
import { sql } from 'kysely';

import type { JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { BaseRepository } from '../../../lib/base.repo';
import type {
  Models,
  OperationDataType,
  TypeId,
  TypeTenantId,
} from '../../../../../../../libs/common/src/lib/kysely.models';
import { SYSTEM_TAG_SEED_DATA } from '../system-tags';

export class TagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  private lowercaseRow<R extends OperationDataType<'tags', 'insert' | 'update'>>(row: R): R {
    if (row && typeof row.name === 'string') {
      return {
        ...row,
        name: row.name.toLowerCase().trim(),
      };
    }
    return row;
  }

  public override async add(input: { row: OperationDataType<'tags', 'insert'> }, trx?: Transaction<Models>) {
    return super.add({ row: this.lowercaseRow(input.row) }, trx);
  }

  public override async addMany(input: { rows: OperationDataType<'tags', 'insert'>[] }, trx?: Transaction<Models>) {
    return super.addMany({ rows: input.rows.map((row) => this.lowercaseRow(row)) }, trx);
  }

  public override async addOrGet<K extends keyof Models['tags'] & string>(
    input: {
      row: OperationDataType<'tags', 'insert'>;
      onConflictColumn: K;
    },
    trx?: Transaction<Models>,
  ): Promise<Selectable<Models['tags']> | undefined> {
    const row = this.lowercaseRow(input.row);
    const type = row.type ?? 'tag';
    const insertResult = await this.getInsert(trx)
      .values(row)
      .onConflict((oc) => oc.columns(['tenant_id', 'name', 'type']).doNothing())
      .returningAll()
      .executeTakeFirst();

    if (insertResult) return insertResult as unknown as Selectable<Models['tags']>;

    return this.getSelect(trx)
      .selectAll()
      .where('tenant_id', '=', row.tenant_id)
      .where('name', '=', row.name)
      .where('type', '=', type)
      .executeTakeFirst();
  }

  public override async update(
    input: {
      tenant_id: TypeTenantId<'tags'>;
      id: TypeId<'tags'>;
      row: OperationDataType<'tags', 'update'>;
    },
    trx?: Transaction<Models>,
  ) {
    return super.update(
      {
        tenant_id: input.tenant_id,
        id: input.id,
        row: this.lowercaseRow(input.row),
      },
      trx,
    );
  }

  public override getAll(
    input: {
      tenant_id: TypeTenantId<'tags'>;
      options?: QueryParams<'tags'> & { type?: 'tag' | 'issue' };
    },
    trx?: Transaction<Models>,
  ) {
    let query = this.getSelectWithColumns(input.options, trx);
    query = query.where('tenant_id', '=', input.tenant_id);
    const type = input.options?.type;
    if (type) {
      query = query.where('type', '=', type);
    }
    return query.execute();
  }

  public override async deleteMany(input: { tenant_id: TypeTenantId<'tags'>; ids: TypeId<'tags'>[] }) {
    return await this.transaction().execute(async (trx) => {
      if (!input.ids.length) return false;

      const deletableRows = await trx
        .selectFrom(this.table)
        .select(['id'])
        .where('tenant_id', '=', input.tenant_id)
        .where('id', 'in', input.ids)
        .where('deletable', '=', true)
        .execute();

      if (!deletableRows.length) return false;

      const deletableIds = deletableRows.map((row) => row.id);

      await trx
        .deleteFrom('map_households_tags')
        .where('tag_id', 'in', deletableIds)
        .where('tenant_id', '=', input.tenant_id)
        .execute();
      await trx
        .deleteFrom('map_peoples_tags')
        .where('tag_id', 'in', deletableIds)
        .where('tenant_id', '=', input.tenant_id)
        .execute();

      // Fix: Nullify the tag association on past imports before deleting the tag
      await trx
        .updateTable('data_imports')
        .set({ tag_id: null })
        .where('tag_id', 'in', deletableIds)
        .where('tenant_id', '=', input.tenant_id)
        .execute();

      const result = await trx
        .deleteFrom(this.table)
        .where('id', 'in', deletableIds)
        .where('tenant_id', '=', input.tenant_id)
        .executeTakeFirst();

      return Number(result?.numDeletedRows ?? 0) > 0;
    });
  }

  public async ensureSystemTags(input: { tenant_id: string; user_id: string }, trx?: Transaction<Models>) {
    for (const seed of SYSTEM_TAG_SEED_DATA) {
      const existing = await this.getSelect(trx)
        .select(['id', 'deletable', 'color'])
        .where('tenant_id', '=', input.tenant_id)
        .where('name', '=', seed.name)
        .where('type', '=', 'tag')
        .executeTakeFirst();

      if (!existing) {
        const row = {
          tenant_id: input.tenant_id,
          name: seed.name,
          description: seed.description,
          color: seed.color ?? null,
          deletable: false,
          type: 'tag',
          createdby_id: input.user_id,
          updatedby_id: input.user_id,
        } as OperationDataType<'tags', 'insert'>;

        await this.add({ row }, trx);
        continue;
      }

      const desiredColor = seed.color ?? null;
      const needsDeletableUpdate = existing.deletable !== false;
      const needsColorUpdate = existing.color !== desiredColor;
      if (needsDeletableUpdate || needsColorUpdate) {
        const updateRow: OperationDataType<'tags', 'update'> = {
          updatedby_id: input.user_id,
          ...(needsDeletableUpdate ? { deletable: false } : {}),
          ...(needsColorUpdate ? { color: desiredColor } : {}),
        };

        await this.update(
          {
            tenant_id: input.tenant_id,
            id: String(existing.id),
            row: updateRow,
          },
          trx,
        );
      }
    }
  }

  public override async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags' | 'map_households_tags'> & {
        type?: 'tag' | 'issue';
      };
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams & { type?: 'tag' | 'issue' } = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = this.normalizeSearch(options.searchStr);
    const filterModel = (options.filterModel ?? {}) as Record<string, any>;
    const type = options.type;

    // Pagination defaults
    const startRow = typeof options.startRow === 'number' ? options.startRow : 0;
    const endRow = typeof options.endRow === 'number' && options.endRow > startRow ? options.endRow : startRow + 100;

    // Shared filter/search logic for both queries
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .leftJoin('map_peoples_tags', 'map_peoples_tags.tag_id', 'tags.id')
        .leftJoin('map_households_tags', 'map_households_tags.tag_id', 'tags.id')
        .where('tags.tenant_id', '=', tenantId)
        .$if(!!type, (qb) => qb.where('tags.type', '=', type!))
        .$if(!!searchStr, (qb) => {
          const text = searchStr;
          return qb.where(
            sql<boolean>`(
            LOWER(tags.name) LIKE ${text} OR
            LOWER(tags.description) LIKE ${text}
          )`,
          );
        })
        .$if(!!filterModel['name']?.value, (q) => q.where('tags.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel['description']?.value, (q) =>
          q.where('tags.description', 'ilike', `%${filterModel['description'].value}%`),
        )
        .$if(!!filterModel['deletable']?.value || typeof filterModel['deletable'] === 'string', (q) => {
          const raw = filterModel['deletable']?.value ?? filterModel['deletable'];
          const v = String(raw || '')
            .trim()
            .toLowerCase();
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
        'tags.color',
        'tags.deletable',
        'tags.type',
        fn.count('map_peoples_tags.person_id').as('use_count_people'),
        fn.count('map_households_tags.household_id').as('use_count_households'),
      ])
      .groupBy(['tags.id', 'tags.name', 'tags.description', 'tags.color', 'tags.deletable', 'tags.type'])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce(
          (acc, sort) => acc.orderBy(sort.colId as ReferenceExpression<any, any>, sort.sort),
          qb,
        ),
      )
      .offset(startRow)
      .limit(endRow - startRow)
      .execute();

    return {
      rows,
      count,
    };
  }

  public getIdByName(input: { tenant_id: string; name: string; type?: 'tag' | 'issue' }, trx?: Transaction<Models>) {
    let q = this.getSelect(trx)
      .select('id')
      .where('name', '=', input.name.toLowerCase().trim())
      .where('tenant_id', '=', input.tenant_id);
    if (input.type) {
      q = q.where('type', '=', input.type);
    }
    return q.executeTakeFirst();
  }

  public findByNameAndType(
    input: { tenant_id: string; name: string; type: 'tag' | 'issue' },
    trx?: Transaction<Models>,
  ) {
    return this.getSelect(trx)
      .select(['name'])
      .where('tenant_id', '=', input.tenant_id)
      .where('name', 'ilike', input.name + '%')
      .where('type', '=', input.type)
      .limit(3)
      .execute();
  }
}
