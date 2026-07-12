import { Service } from '@angular/core';
import {
  AddTaskType,
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateTaskType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { RouterInputs, RouterOutputs } from '../../../services/api/trpc-types';

@Service()
export class TasksService extends AbstractAPIService<'tasks', UpdateTaskType> {
  protected override readonly endpointName = 'tasks';

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

  /** Live count of open tasks past the working-hours SLA target — sidebar badge + count sentences (spec §4). */
  public countSlaBreaches(): Promise<number> {
    return this.api.tasks.countSlaBreaches.query();
  }

  /** The count-sentence numbers in one call: open total, unassigned, assigned-to-me, SLA breaches. */
  public getSummaryCounts(): Promise<{
    assignedToMe: number;
    openTotal: number;
    slaBreaches: number;
    unassigned: number;
  }> {
    return this.api.tasks.getSummaryCounts.query();
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

  public import(input: RouterInputs['tasks']['import']): Promise<RouterOutputs['tasks']['import']> {
    return this.api.tasks.import.mutate(input);
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.tasks.exportCsv.mutate(input);
  }
}
