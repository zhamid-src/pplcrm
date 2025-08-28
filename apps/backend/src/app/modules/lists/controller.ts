import { AddListType, IAuthKeyPayload, UpdateListType, getAllOptionsType } from '@common';

import { QueryParams } from '../../lib/base.repo';
import { BaseController } from '../../lib/base.controller';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { ListsRepo } from './repositories/lists.repo';
import { PersonsRepo } from '../persons/repositories/persons.repo';
import { HouseholdRepo } from '../households/repositories/households.repo';

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
  public async addList(payload: AddListType, auth: IAuthKeyPayload) {
    const repo = this.getRepo();
    return repo.transaction().execute(async (trx) => {
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

      const list = await repo.add({ row: row as OperationDataType<'lists', 'insert'> }, trx);

      if (!row.is_dynamic && payload.definition) {
        const def = payload.definition as any;
        const options = { ...def };
        const tags = options.tags as string[] | undefined;
        delete (options as any).tags;

        if (row.object === 'people') {
          const personsRepo = new PersonsRepo();
          const persons = await personsRepo.getAllWithAddress({
            tenant_id: auth.tenant_id,
            options,
            tags,
          }, trx);

          const members = persons.rows.map((p: any) => ({
            list_id: list.id,
            person_id: p.id,
            tenant_id: auth.tenant_id,
            createdby_id: auth.user_id,
            updatedby_id: auth.user_id,
          }));
          if (members.length) await repo.addPersons(members, trx);
        } else if (row.object === 'households') {
          const householdsRepo = new HouseholdRepo();
          const households = await householdsRepo.getAllWithPeopleCount({
            tenant_id: auth.tenant_id,
            options,
            tags,
          }, trx);
          const members = households.rows.map((h: any) => ({
            list_id: list.id,
            household_id: h.id,
            tenant_id: auth.tenant_id,
            createdby_id: auth.user_id,
            updatedby_id: auth.user_id,
          }));
          if (members.length) await repo.addHouseholds(members, trx);
        }
      }

      return list;
    });
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
