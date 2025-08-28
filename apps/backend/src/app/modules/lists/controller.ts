import type { AddListType, IAuthKeyPayload, UpdateListType, getAllOptionsType } from '@common';

import type { QueryParams } from '../../lib/base.repo';
import { BaseController } from '../../lib/base.controller';
import type { OperationDataType } from 'common/src/lib/kysely.models';
import { ListsRepo } from './repositories/lists.repo';
import { PersonsController } from '../persons/controller';
import { HouseholdsController } from '../households/controller';
import { MapListsPersonsRepo } from './repositories/map-lists-persons.repo';
import { MapListsHouseholdsRepo } from './repositories/map-lists-households.repo';

/**
 * Controller handling CRUD and reporting for lists of people or households.
 */
export class ListsController extends BaseController<'lists', ListsRepo> {
  private personsController = new PersonsController();
  private householdsController = new HouseholdsController();
  private mapListsPersonsRepo = new MapListsPersonsRepo();
  private mapListsHouseholdsRepo = new MapListsHouseholdsRepo();

  constructor() {
    super(new ListsRepo());
  }

  /**
   * Create a new list for the authenticated tenant.
   */
  public async addList(payload: AddListType, auth: IAuthKeyPayload) {
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

    const list = await this.add(row as OperationDataType<'lists', 'insert'>);

    // For static lists, populate membership based on provided definition
    if (!row.is_dynamic && payload.definition) {
      if (payload.object === 'people') {
        const result = await this.personsController.getAllWithAddress(
          auth,
          payload.definition as getAllOptionsType,
        );
        const rows = result.rows.map((p: { id: string }) => ({
          tenant_id: auth.tenant_id,
          list_id: list.id,
          person_id: p.id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        }));
        if (rows.length) {
          await this.mapListsPersonsRepo.addMany({
            rows: rows as OperationDataType<'map_lists_persons', 'insert'>[],
          });
        }
      } else if (payload.object === 'households') {
        const result = await this.householdsController.getAllWithPeopleCount(
          auth,
          payload.definition as getAllOptionsType,
        );
        const rows = result.rows.map((h: { id: string }) => ({
          tenant_id: auth.tenant_id,
          list_id: list.id,
          household_id: h.id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        }));
        if (rows.length) {
          await this.mapListsHouseholdsRepo.addMany({
            rows: rows as OperationDataType<'map_lists_households', 'insert'>[],
          });
        }
      }
    }

    return list;
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
