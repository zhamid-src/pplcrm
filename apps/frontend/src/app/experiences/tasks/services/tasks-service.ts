import { Injectable } from '@angular/core';
import { AddTaskType, ExportCsvInputType, ExportCsvResponseType, UpdateTaskType, getAllOptionsType } from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Injectable({ providedIn: 'root' })
export class TasksService extends AbstractAPIService<'tasks', UpdateTaskType> {
  public add(row: AddTaskType) {
    return this.api.tasks.add.mutate(row);
  }

  public addMany(_rows: AddTaskType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.tasks.count.query();
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.tasks.delete.mutate(id)) !== null;
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.tasks.deleteMany.mutate(ids)) !== null;
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.api.tasks.getAll.query(options, { signal: this.ac.signal }) as Promise<{
      rows: { [x: string]: any }[];
      count: number;
    }>;
  }

  public getAllArchived(options?: getAllOptionsType) {
    return this.api.tasks.getArchived.query(options, { signal: this.ac.signal }) as Promise<{
      rows: { [x: string]: any }[];
      count: number;
    }>;
  }

  public getById(id: string) {
    return this.api.tasks.getById.query(id);
  }

  public async getTags(_id: string) {
    return [];
  }

  public update(id: string, data: UpdateTaskType) {
    return this.api.tasks.update.mutate({ id, data });
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.tasks.exportCsv.mutate(input);
  }
}
