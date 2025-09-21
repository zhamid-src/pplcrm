import { Injectable } from '@angular/core';
import {
  AddMarketingEmailType,
  ExportCsvInputType,
  ExportCsvResponseType,
  MarketingEmailTopLinkType,
  UpdateMarketingEmailType,
  getAllOptionsType,
} from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Injectable({ providedIn: 'root' })
export class NewslettersService extends AbstractAPIService<'newsletters', UpdateMarketingEmailType> {
  public add(_row: AddMarketingEmailType) {
    return Promise.reject(new Error('Newsletters are read-only.'));
  }

  public addMany(_rows: AddMarketingEmailType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.newsletters.count.query();
  }

  public async delete(_id: string): Promise<boolean> {
    return false;
  }

  public async deleteMany(_ids: string[]): Promise<boolean> {
    return false;
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public async getAll(options?: getAllOptionsType) {
    const result = await this.api.newsletters.getAllWithCounts.query(options, { signal: this.ac.signal });
    const rows = (result?.rows ?? []).map((row: any) => this.normalize(row));
    const count = result?.count != null ? Number(result.count) : rows.length;
    return { rows, count };
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public async getById(id: string) {
    const record = await this.api.newsletters.getById.query(id);
    return this.normalize(record);
  }

  public async getTags(_id: string) {
    return [];
  }

  public update(_id: string, _data: UpdateMarketingEmailType) {
    return Promise.reject(new Error('Newsletters are read-only.'));
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.newsletters.exportCsv.mutate(input);
  }

  private normalize(record: any) {
    if (!record) return record;
    const top_links = this.parseJsonArray<MarketingEmailTopLinkType>(record.top_links);
    const attachments = this.parseJsonArray<{ name: string; url?: string; size?: number }>(record.attachments);
    const asNumber = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const asDate = (value: unknown) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      const date = new Date(value as string);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    return {
      ...record,
      status: typeof record.status === 'string' ? record.status.toLowerCase() : record.status,
      tenant_id: record.tenant_id != null ? String(record.tenant_id) : record.tenant_id,
      createdby_id: record.createdby_id != null ? String(record.createdby_id) : record.createdby_id,
      updatedby_id: record.updatedby_id != null ? String(record.updatedby_id) : record.updatedby_id,
      total_recipients: asNumber(record.total_recipients) ?? 0,
      delivered_count: asNumber(record.delivered_count) ?? 0,
      bounce_count: asNumber(record.bounce_count) ?? 0,
      open_rate: asNumber(record.open_rate) ?? 0,
      click_rate: asNumber(record.click_rate) ?? 0,
      unique_opens: asNumber(record.unique_opens) ?? 0,
      unique_clicks: asNumber(record.unique_clicks) ?? 0,
      unsubscribe_count: asNumber(record.unsubscribe_count) ?? 0,
      spam_complaint_count: asNumber(record.spam_complaint_count) ?? 0,
      reply_count: asNumber(record.reply_count) ?? 0,
      send_date: asDate(record.send_date),
      last_engagement_at: asDate(record.last_engagement_at),
      created_at: asDate(record.created_at) ?? new Date(),
      updated_at: asDate(record.updated_at) ?? new Date(),
      top_links,
      attachments,
    };
  }

  private parseJsonArray<T>(value: unknown): T[] | null {
    if (!value) return null;
    if (Array.isArray(value)) return value as T[];
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
}
