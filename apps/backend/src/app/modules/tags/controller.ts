import { AddTagType, IAuthKeyPayload, UpdateTagType } from '@common';

import { ConflictError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { TagsRepo } from './repositories/tags.repo';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Controller for managing tags: creation, updating, searching, and reporting.
 */
export class TagsController extends BaseController<'tags', TagsRepo> {
  constructor() {
    super(new TagsRepo());
  }

  /**
   * Add a new tag to the database for the authenticated tenant.
   *
   * @param payload - Tag data (name, description)
   * @param auth - Authenticated user's context
   * @returns The inserted tag
   */
  public async addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      color: payload.color ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
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

  /**
   * Search for tags by name prefix. Returns up to 3 matches.
   *
   * @param name - Name prefix to search for
   * @param auth - Authenticated user's context
   * @returns Array of matching tags (up to 3)
   */
  public async findByName(name: string, auth: IAuthKeyPayload) {
    return this.find({
      tenant_id: auth.tenant_id,
      key: name,
      column: 'name',
    });
  }

  /**
   * Update an existing tag by ID.
   *
   * @param id - Tag ID to update
   * @param row - Updated tag data (name, description, etc.)
   * @param auth - Authenticated user's context
   * @returns The updated tag
   */
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
