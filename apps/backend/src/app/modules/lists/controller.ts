import type { AddListType, IAuthKeyPayload, UpdateListType, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';

import { BaseController } from '../../lib/base.controller';
import type { QueryParams } from '../../lib/base.repo';
import { HouseholdsController } from '../households/controller';
import { PersonsController } from '../persons/controller';
import { ListsRepo } from './repositories/lists.repo';
import { MapListsHouseholdsRepo } from './repositories/map-lists-households.repo';
import { MapListsPersonsRepo } from './repositories/map-lists-persons.repo';
import type { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Controller handling CRUD and reporting for lists of people or households.
 */
export class ListsController extends BaseController<'lists', ListsRepo> {
  private householdsController = new HouseholdsController();
  private mapListsHouseholdsRepo = new MapListsHouseholdsRepo();
  private mapListsPersonsRepo = new MapListsPersonsRepo();
  private personsController = new PersonsController();

  constructor() {
    super(new ListsRepo());
  }

  /**
   * Create a new list for the authenticated tenant.
   */
  public async addList(payload: AddListType, auth: IAuthKeyPayload) {
    // Enforce unique list names per tenant
    const existing = await this.getRepo().getOneBy('name', {
      tenant_id: auth.tenant_id,
      value: payload.name,
    });
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'A list with this name already exists.' });

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

    // For static lists, populate membership by explicit IDs if provided; otherwise by definition
    if (!row.is_dynamic) {
      const ids = payload.member_ids ?? [];

      if (ids.length && payload.object === 'people') {
        const rows = ids.map((person_id) => ({
          tenant_id: auth.tenant_id,
          list_id: list.id,
          person_id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        }));
        await this.mapListsPersonsRepo.addMany({ rows: rows as OperationDataType<'map_lists_persons', 'insert'>[] });
      } else if (ids.length && payload.object === 'households') {
        const rows = ids.map((household_id) => ({
          tenant_id: auth.tenant_id,
          list_id: list.id,
          household_id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        }));
        await this.mapListsHouseholdsRepo.addMany({
          rows: rows as OperationDataType<'map_lists_households', 'insert'>[],
        });
      } else if (payload.definition) {
        if (payload.object === 'people') {
          const result = await this.personsController.getAllWithAddress(auth, payload.definition as getAllOptionsType);
          const rows = result.rows.map((p) => ({
            tenant_id: auth.tenant_id,
            list_id: list.id,
            person_id: p['id'],
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
          const rows = result.rows.map((h) => ({
            tenant_id: auth.tenant_id,
            list_id: list.id,
            household_id: h['id'],
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

  /**
   * Get all person members of a list with basic address fields.
   */
  public getPersonsByListId(auth: IAuthKeyPayload, list_id: string) {
    return this.getRepo().getPersonsByListId({ tenant_id: auth.tenant_id, list_id });
  }

  /**
   * Get all household members of a list.
   */
  public getHouseholdsByListId(auth: IAuthKeyPayload, list_id: string) {
    return this.getRepo().getHouseholdsByListId({ tenant_id: auth.tenant_id, list_id });
  }
}
