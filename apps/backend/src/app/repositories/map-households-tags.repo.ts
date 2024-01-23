import { BaseRepository } from './base.repo';

export class MapHouseholdsTagsRepo extends BaseRepository<'map_households_tags'> {
  constructor() {
    super('map_households_tags');
  }

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
