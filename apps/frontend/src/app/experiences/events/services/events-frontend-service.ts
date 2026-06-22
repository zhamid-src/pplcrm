import { Service } from '@angular/core';
import type {
  AddEventType,
  UpdateEventType,
  ExportCsvInputType,
  ExportCsvResponseType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class EventsFrontendService extends AbstractAPIService<'events', UpdateEventType> {
  protected override readonly endpointName = 'events';

  public add(row: AddEventType) {
    return this.api.events.add.mutate(row);
  }

  public addMany(_rows: AddEventType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.events.getAll.query({ startRow: 0, endRow: 1 }).then((res: { count: number }) => res.count ?? 0);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.api.events.getAll.query(options, { signal: this.ac.signal });
  }

  public getAllArchived(options?: getAllOptionsType) {
    return this.api.events.getAll.query({ ...options, includeArchived: true }, { signal: this.ac.signal });
  }

  public getById(id: string) {
    return this.api.events.getById.query(id);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public update(id: string, data: UpdateEventType) {
    return this.api.events.update.mutate({ id, data });
  }

  public checkSlugUnique(slug: string, excludeId?: string | null) {
    return this.api.events.checkSlugUnique.query({ slug, excludeId });
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Event export is not available'));
  }
}
