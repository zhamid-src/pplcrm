import { AddListType, IAuthKeyPayload, UpdateListType, getAllOptionsType } from '@common';

import { QueryParams } from '../../lib/base.repo';
import { BaseController } from '../../lib/base.controller';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { ListsRepo } from './repositories/lists.repo';

/**
 * Controller handling CRUD and reporting for lists of people or households.
 */
export class ListsController extends BaseController<'lists', ListsRepo> {
  constructor() {
    super(new ListsRepo());
  }

  /**
   * Create a new list for the authenticated tenant.
   */
  public addList(payload: AddListType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description,
      object: payload.object,
      is_dynamic: payload.is_dynamic ?? false,
      definition: payload.definition ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    };
    return this.add(row as OperationDataType<'lists', 'insert'>);
  }

  /**
   * Fetch all lists including computed sizes and metadata.
   */
  public getAllWithCounts(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllWithCounts({
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'lists' | 'map_lists_persons' | 'map_lists_households' | 'authusers'>,
    });
  }

  /**
   * Update an existing list.
   */
  public updateList(id: string, row: UpdateListType, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = {
      ...row,
      updatedby_id: auth.user_id,
    };
    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row: rowWithUpdatedBy as OperationDataType<'lists', 'update'>,
    });
  }
}
