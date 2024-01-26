import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { TagsRepo } from '../repositories/tags.repo';
import { BaseController } from './base.controller';

export class TagsController extends BaseController<'tags', TagsRepo> {
  constructor() {
    super(new TagsRepo());
  }

  public getAllWithCounts(tenant_id: string) {
    return this.getRepo().getAllWithCounts({ tenant_id });
  }
  /**
   * Add the new tag to the database.
   */
  public addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    } as OperationDataType<'tags', 'insert'>;
    return this.add(row);
  }

  /**
   * Given the key, return the first three tags that match the key.
   */
  public findByName(name: string, auth: IAuthKeyPayload): Promise<{ name: string }[]> {
    return this.find({ tenant_id: auth.tenant_id, key: name, column: 'name' });
  }

  /**
   * Update the tag that matches the given ID
   */
  public updateTag(id: string, row: UpdateTagType, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = { ...row, updatedby_id: auth.user_id } as OperationDataType<
      'tags',
      'insert'
    >;
    return this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });
  }
}
