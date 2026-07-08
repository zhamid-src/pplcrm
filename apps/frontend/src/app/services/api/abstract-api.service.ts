import { signal, Service } from '@angular/core';
import {
  DataExportRecordType,
  ExportCsvInputType,
  ExportCsvResponseType,
  getAllOptionsType,
  LogInstantExportInputType,
  QueueExportInputType,
} from '../../../../../../libs/common/src';
import { TRPCService } from './trpc-service';
import { TRPCClient } from '@trpc/client';
import { TRPCRouter } from '../../../../../backend/src/app/modules/trpc';

import { Models } from '../../../../../../libs/common/src/lib/kysely.models';

@Service()
export abstract class AbstractAPIService<T extends keyof Models, U> extends TRPCService<T> {
  protected abstract readonly endpointName: keyof TRPCClient<TRPCRouter>;

  public readonly refreshCount = signal(0);

  public triggerRefresh() {
    this.refreshCount.update((n) => n + 1);
  }
  public abstract add(row: U, options?: unknown): Promise<Partial<T> | unknown>;

  public abstract addMany(rows: U[]): Promise<Partial<T>[] | unknown>;

  public abstract attachTag(id: string, tag_name: string, type?: 'tag' | 'issue'): Promise<unknown>;

  public abstract count(): Promise<number>;

  public async delete(id: string): Promise<boolean> {
    const endpoint = this.api[this.endpointName] as {
      delete: { mutate: (id: string) => Promise<unknown> };
    };
    if (!endpoint) {
      throw new Error(`Endpoint for "${String(this.endpointName)}" not found on tRPC client.`);
    }
    return (await endpoint.delete.mutate(id)) !== null;
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    const endpoint = this.api[this.endpointName] as {
      delete: { mutate: (id: string) => Promise<unknown> };
      deleteMany?: { mutate: (ids: string[]) => Promise<unknown> };
    };
    if (!endpoint) {
      throw new Error(`Endpoint for "${String(this.endpointName)}" not found on tRPC client.`);
    }
    if ('deleteMany' in endpoint && endpoint.deleteMany) {
      return (await endpoint.deleteMany.mutate(ids)) !== null;
    }
    const results = await Promise.all(ids.map((id) => this.delete(id)));
    return results.every(Boolean);
  }

  public abstract detachTag(id: string, tag_name: string, type?: 'tag' | 'issue'): Promise<unknown>;

  public abstract getAll(options?: getAllOptionsType): Promise<{ rows: Record<string, unknown>[]; count: number }>;

  public abstract getAllArchived(
    options?: getAllOptionsType,
  ): Promise<{ rows: Record<string, unknown>[]; count: number }>;

  public abstract getById(id: string): Promise<unknown>;

  public abstract getTags(id: string, type?: 'tag' | 'issue'): Promise<string[]>;

  public abstract update(id: string, data: U, options?: unknown): Promise<Partial<T>[] | unknown>;

  public abstract exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType>;

  public queueExport(input: QueueExportInputType): Promise<DataExportRecordType> {
    const exportsEndpoint = this.api.exports as {
      queue: { mutate: (input: QueueExportInputType) => Promise<DataExportRecordType> };
    };
    return exportsEndpoint.queue.mutate(input);
  }

  public logInstantExport(input: LogInstantExportInputType): Promise<DataExportRecordType> {
    const exportsEndpoint = this.api.exports as {
      logInstant: { mutate: (input: LogInstantExportInputType) => Promise<DataExportRecordType> };
    };
    return exportsEndpoint.logInstant.mutate(input);
  }
}
