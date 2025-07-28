import { OperandValueExpressionOrList, Transaction } from 'kysely';

import { BaseRepository } from './base.repo';
import { Models, TypeId, TypeTenantId } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `tags` table and related mapping tables.
 */
export class TagsRepo extends BaseRepository<'tags'> {
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

      return (await trx.deleteFrom('tags').where('id', 'in', tag_ids).where('deletable', '=', true).execute()) !== null;
    });
  }

  /**
   * Retrieves all tags for a tenant, including usage counts from both people and households.
   *
   * @param input.tenant_id - Tenant scope
   * @param trx - Optional Kysely transaction
   * @returns A list of tags with usage statistics
   */
  public getAllWithCounts(
    input: {
      tenant_id: string;
    },
    trx?: Transaction<Models>,
  ) {
    return this.getSelect(trx)
      .leftJoin('map_peoples_tags', 'map_peoples_tags.tag_id', 'tags.id')
      .leftJoin('map_households_tags', 'map_households_tags.tag_id', 'tags.id')
      .select(({ fn }) => [
        'tags.id',
        'tags.name',
        'tags.description',
        'tags.deletable',
        fn.count('map_peoples_tags.person_id').as('use_count_people'),
        fn.count('map_households_tags.household_id').as('use_count_households'),
      ])
      .groupBy(['tags.id', 'tags.name', 'tags.description', 'tags.deletable'])
      .where('tags.tenant_id', '=', input.tenant_id)
      .execute();
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
