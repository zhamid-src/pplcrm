import { BaseRepository } from '../base.repo';

/**
 * Repository for interacting with the `map_peoples_tags` table.
 * Handles mappings between people and tags.
 */
export class MapPersonsTagRepo extends BaseRepository<'map_peoples_tags'> {
  constructor() {
    super('map_peoples_tags');
  }

  /**
   * Get the ID of the mapping entry for a given person and tag.
   *
   * @param input - An object containing tenant_id, person_id, and tag_id.
   * @returns The ID of the matching mapping entry, or undefined if not found.
   */
  public async getId(input: { tenant_id: string; person_id: string; tag_id: string }) {
    const payload = await this.getSelect()
      .select('id')
      .where('person_id', '=', input.person_id)
      .where('tag_id', '=', input.tag_id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();
    return payload?.id;
  }
}
