import { AddTagType, IAuthKeyPayload, UpdateTagType } from '../../../../../../libs/common/src';

import { ConflictError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { TagsRepo } from './repositories/tags.repo';
import { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';

export class TagsController extends BaseController<'tags', TagsRepo> {
  constructor() {
    super(new TagsRepo());
  }

  public async addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      color: payload.color ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      type: payload.type ?? 'tag',
    };
    try {
      return await this.add(row as OperationDataType<'tags', 'insert'>);
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictError('A tag with this name already exists.', undefined, { cause: err });
      }
      throw err;
    }
  }

  public async findByName(input: { name: string; type?: 'tag' | 'issue' }, auth: IAuthKeyPayload) {
    const type = input.type ?? 'tag';
    return this.getRepo().findByNameAndType({
      tenant_id: auth.tenant_id,
      name: input.name,
      type,
    });
  }

  public updateTag(id: string, row: UpdateTagType, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = {
      ...row,
      updatedby_id: auth.user_id,
    };
    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row: rowWithUpdatedBy as OperationDataType<'tags', 'update'>,
    });
  }
}
