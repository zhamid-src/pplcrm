import { AddTagType, IAuthKeyPayload, UpdateTagType, getAllOptionsType } from '@common';

import { QueryParams } from '../../lib/base.repo';
import { TagsRepo } from './repositories/tags.repo';
import { BaseController } from '../../lib/base.controller';
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
  public addTag(payload: AddTagType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    };
    return this.add(row as OperationDataType<'tags', 'insert'>);
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
   * Get all tags in the tenant along with how many entities use each tag.
   *
   * @param tenant_id - Tenant ID
   * @returns Tags with usage counts
   */
  public getAllWithCounts(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllWithCounts({
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
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
