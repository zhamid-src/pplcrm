import { Service } from '@angular/core';
import {
  AddListType,
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateListType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class ListsService extends AbstractAPIService<'lists', UpdateListType> {
  protected override readonly endpointName = 'lists';

  public add(row: AddListType) {
    return (this.api.lists.add.mutate as unknown as (input: any, opts: any) => Promise<any>)(row, {
      meta: { skipErrorHandler: true },
    });
  }

  public addMany(rows: AddListType[]) {
    return Promise.resolve(rows);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.lists.count.query();
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithCounts(options);
  }

  // We don't support archives
  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getAllWithCounts(options?: getAllOptionsType) {
    return this.api.lists.getAllWithCounts.query(options, { signal: this.ac.signal });
  }

  public getById(id: string) {
    return this.api.lists.getById.query(id);
  }

  public getMembersHouseholds(list_id: string) {
    return this.api.lists.getMembersHouseholds.query(list_id);
  }

  public getMembersPersons(list_id: string) {
    return this.api.lists.getMembersPersons.query(list_id);
  }

  public async getTags(_id: string) {
    return [];
  }

  public update(id: string, data: UpdateListType) {
    return this.api.lists.update.mutate({ id, data });
  }

  public refreshList(id: string) {
    return this.api.lists.refresh.mutate(id);
  }

  public getListStats(id: string) {
    return this.api.lists.getListStats.query(id);
  }

  public getMemberCount(id: string): Promise<number> {
    return this.api.lists.getMemberCount.query(id);
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.lists.exportCsv.mutate(input);
  }
}
