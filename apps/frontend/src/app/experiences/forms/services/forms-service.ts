import { Service } from '@angular/core';
import {
  AddWebFormType,
  CreateFormType,
  ExportCsvInputType,
  ExportCsvResponseType,
  FormField,
  FormStatus,
  FormType,
  UpdateFormType,
  UpdateWebFormType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

/** A form as consumed by the new Forms experience (fields normalized to objects by the server). */
export interface FormDetail {
  id: string;
  name: string;
  description: string | null;
  redirect_url: string | null;
  status: FormStatus;
  type: FormType | null;
  slug: string | null;
  submit_label: string | null;
  thanks_title: string | null;
  thanks_body: string | null;
  send_confirmation: boolean;
  confirm_subject: string | null;
  confirm_body: string | null;
  notify_team_on: boolean;
  target_tags: string[];
  target_lists: string[];
  fields: FormField[];
  submission_count: number;
  updated_at: Date | string;
  created_at: Date | string;
}

export interface FormSubmissionRow {
  id: string;
  person_id: string;
  person_name: string | null;
  answers: Record<string, unknown>;
  created_at: Date | string;
}

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

  // --- North Star lifecycle endpoints (new Forms experience) ---

  public listForms(): Promise<FormDetail[]> {
    return this.api.webForms.list.query(undefined, { signal: this.ac.signal }) as Promise<FormDetail[]>;
  }

  public getForEdit(id: string): Promise<FormDetail> {
    return this.api.webForms.getForEdit.query(id) as Promise<FormDetail>;
  }

  public createForm(input: CreateFormType): Promise<FormDetail> {
    return this.api.webForms.create.mutate(input) as Promise<FormDetail>;
  }

  public updateLive(id: string, data: UpdateFormType): Promise<FormDetail> {
    return this.api.webForms.updateLive.mutate({ id, data }) as Promise<FormDetail>;
  }

  public publish(id: string): Promise<FormDetail> {
    return this.api.webForms.publish.mutate(id) as Promise<FormDetail>;
  }

  public unpublish(id: string): Promise<FormDetail> {
    return this.api.webForms.unpublish.mutate(id) as Promise<FormDetail>;
  }

  public archive(id: string): Promise<FormDetail> {
    return this.api.webForms.archive.mutate(id) as Promise<FormDetail>;
  }

  public restore(id: string): Promise<FormDetail> {
    return this.api.webForms.restore.mutate(id) as Promise<FormDetail>;
  }

  public deleteDraft(id: string): Promise<unknown> {
    return this.api.webForms.deleteDraft.mutate(id);
  }

  public getSubmissions(
    id: string,
    cursor?: number,
  ): Promise<{ items: FormSubmissionRow[]; total: number; nextCursor: number | null }> {
    return this.api.webForms.submissions.query({ id, cursor }) as Promise<{
      items: FormSubmissionRow[];
      total: number;
      nextCursor: number | null;
    }>;
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
