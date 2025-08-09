/**
 * Repository handling the mapping between households and tags.
 */
import { BaseRepository } from '../base.repo';

/**
 * Data access for the `map_households_tags` table.
 */
export class MapHouseholdsTagsRepo extends BaseRepository<'map_households_tags'> {
  /**
   * Creates a repository instance for the `map_households_tags` table.
   */
  constructor() {
    super('map_households_tags');
  }

  /**
   * Retrieves the ID of the tag-to-household mapping record.
   *
   * @param tenant_id - The tenant's ID.
   * @param household_id - The ID of the household.
   * @param tag_id - The ID of the tag.
   * @returns The ID of the mapping if found, otherwise undefined.
   */
  public async getId(tenant_id: string, household_id: string, tag_id: string) {
    const payload = await this.getSelect()
      .select('id')
      .where('household_id', '=', household_id)
      .where('tag_id', '=', tag_id)
      .where('tenant_id', '=', tenant_id)
      .executeTakeFirst();
    return payload?.id;
  }
}
