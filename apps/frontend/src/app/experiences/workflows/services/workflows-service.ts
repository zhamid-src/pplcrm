import { Service } from '@angular/core';
import {
  AddWorkflowType,
  UpdateWorkflowType,
  getAllOptionsType,
  ExportCsvInputType,
  ExportCsvResponseType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class WorkflowsService extends AbstractAPIService<'workflows', UpdateWorkflowType> {
  protected override readonly endpointName = 'workflows';

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Export CSV is not supported for workflows.'));
  }

  public add(row: AddWorkflowType) {
    return this.api.workflows.create.mutate(row);
  }

  public addMany(_rows: AddWorkflowType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.workflows.count.query();
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public async getAll(options?: getAllOptionsType) {
    const result = await this.api.workflows.getAllWithCounts.query(options, { signal: this.ac.signal });
    const rows = (result?.rows ?? []).map((row: any) => this.normalize(row));
    const count = result?.count != null ? Number(result.count) : rows.length;
    return { rows, count };
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public async getById(id: string) {
    const record = await this.api.workflows.getById.query(id);
    return this.normalize(record);
  }

  public async getSteps(id: string) {
    return this.api.workflows.getSteps.query(id);
  }

  public async saveSteps(workflowId: string, steps: any[]) {
    return this.api.workflows.saveSteps.mutate({ workflowId, steps });
  }

  public async getEnrollments(workflowId: string, options?: any) {
    return this.api.workflows.getEnrollments.query({ workflowId, options });
  }

  public async enrollPerson(workflowId: string, personId: string) {
    return this.api.workflows.enrollPerson.mutate({ workflowId, personId });
  }

  public async cancelEnrollment(enrollmentId: string) {
    return this.api.workflows.cancelEnrollment.mutate({ enrollmentId });
  }

  public async getTags(_id: string) {
    return [];
  }

  public update(id: string, data: UpdateWorkflowType) {
    return this.api.workflows.update.mutate({ id, data });
  }

  private normalize(record: any) {
    if (!record) return record;
    return {
      ...record,
      id: String(record.id),
      created_at: record.created_at ? new Date(record.created_at) : new Date(),
      updated_at: record.updated_at ? new Date(record.updated_at) : new Date(),
    };
  }
}
