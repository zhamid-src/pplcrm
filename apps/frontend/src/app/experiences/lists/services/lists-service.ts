import { Injectable } from '@angular/core';
import { AddListType, UpdateListType, getAllOptionsType } from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

/** Service handling CRUD operations for list entities. */
@Injectable({
  providedIn: 'root',
})
export class ListsService extends AbstractAPIService<'lists', UpdateListType> {
  /** Add a new list (opt-out of global error toast to avoid duplicates) */
  public add(row: AddListType) {
    return (this.api.lists.add.mutate as any)(row, { meta: { skipErrorHandler: true } });
  }

  /** No-op batch add implementation */
  public addMany(rows: AddListType[]) {
    return Promise.resolve(rows);
  }

  /** Tags are not supported on lists */
  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.lists.count.query();
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.lists.delete.mutate(id)) !== null;
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.lists.deleteMany.mutate(ids)) !== null;
  }

  /** Tags are not supported on lists */
  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithCounts(options);
  }

  // We don't support archives
  public getAllArchived() {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getAllWithCounts(options?: getAllOptionsType) {
    return this.api.lists.getAllWithCounts.query(options, { signal: this.ac.signal });
  }

  public getById(id: string) {
    return this.api.lists.getById.query(id);
  }

  /** Get household members for a list */
  public getMembersHouseholds(list_id: string) {
    return this.api.lists.getMembersHouseholds.query(list_id);
  }

  /** Get person members for a list */
  public getMembersPersons(list_id: string) {
    return this.api.lists.getMembersPersons.query(list_id);
  }

  public async getTags(_id: string) {
    return [];
  }

  public update(id: string, data: UpdateListType) {
    return this.api.lists.update.mutate({ id, data });
  }
}
