import { Service } from '@angular/core';
import {
  AddWebFormType,
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateWebFormType,
  getAllOptionsType,
} from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class FormsService extends AbstractAPIService<'web_forms', AddWebFormType | UpdateWebFormType> {
  protected override readonly endpointName = 'webForms';

  public add(row: AddWebFormType) {
    return this.api.webForms.add.mutate(row);
  }

  public addMany(_rows: AddWebFormType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return Promise.resolve(0);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public async getAll(options?: getAllOptionsType) {
    const result = await this.api.webForms.getAllWithCounts.query(options, { signal: this.ac.signal });
    const rows = (result?.rows ?? []).map((row: any) => this.normalize(row));
    const count = result?.count != null ? Number(result.count) : rows.length;
    return { rows, count };
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public async getById(id: string) {
    const record = await this.api.webForms.getById.query(id);
    return this.normalize(record);
  }

  public async getTags(_id: string) {
    return [];
  }

  public update(id: string, data: UpdateWebFormType) {
    return this.api.webForms.update.mutate({ id, data });
  }

  public getSubmissionsCount(id: string): Promise<number> {
    return this.api.webForms.getSubmissionsCount.query(id);
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Export CSV not supported for forms.'));
  }

  private normalize(record: any) {
    if (!record) return record;
    const asDate = (value: unknown) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      const date = new Date(value as string);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    return {
      ...record,
      tenant_id: record.tenant_id != null ? String(record.tenant_id) : record.tenant_id,
      createdby_id: record.createdby_id != null ? String(record.createdby_id) : record.createdby_id,
      updatedby_id: record.updatedby_id != null ? String(record.updatedby_id) : record.updatedby_id,
      created_at: asDate(record.created_at) ?? new Date(),
      updated_at: asDate(record.updated_at) ?? new Date(),
      target_tags: Array.isArray(record.target_tags) ? record.target_tags : [],
      target_lists: Array.isArray(record.target_lists) ? record.target_lists : [],
    };
  }
}
