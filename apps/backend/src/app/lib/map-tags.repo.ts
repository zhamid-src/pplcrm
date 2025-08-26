import { BaseRepository } from './base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Generic repository for mapping entities to tags.
 *
 * @typeParam T - Mapping table name.
 */
export class MapTagsRepo<T extends keyof Models> extends BaseRepository<T> {
  private entityColumn: string;

  constructor(table: T, entityColumn: string) {
    super(table);
    this.entityColumn = entityColumn;
  }

  /**
   * Get mapping ID for entity-tag pair.
   */
  public async getId(input: { tenant_id: string; entity_id: string; tag_id: string }) {
    const payload = await this.getSelect()
      .select('id')
      .where(this.entityColumn as any, '=', input.entity_id)
      .where('tag_id', '=', input.tag_id as any)
      .where('tenant_id', '=', input.tenant_id as any)
      .executeTakeFirst();
    return payload?.id as string | undefined;
  }
}
