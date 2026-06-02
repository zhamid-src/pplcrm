import { Service } from '@angular/core';
import {
  AddVolunteerEventType,
  UpdateVolunteerEventType,
  ExportCsvInputType,
  ExportCsvResponseType,
  getAllOptionsType,
} from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class VolunteerEventsFrontendService extends AbstractAPIService<'volunteer_events', UpdateVolunteerEventType> {
  public add(row: AddVolunteerEventType) {
    return this.api.volunteer.add.mutate(row);
  }

  public addMany(_rows: AddVolunteerEventType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.volunteer.getAll
      .query({ startRow: 0, endRow: 1 })
      .then((res: { count: number }) => res.count ?? 0);
  }

  public delete(id: string): Promise<boolean> {
    return this.api.volunteer.delete.mutate(id);
  }

  public deleteMany(ids: string[]): Promise<boolean> {
    return Promise.all(ids.map((id) => this.delete(id))).then((results) => results.every(Boolean));
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.api.volunteer.getAll.query(options, { signal: this.ac.signal });
  }

  public getAllArchived(options?: getAllOptionsType) {
    return this.api.volunteer.getAll.query({ ...options, includeArchived: true }, { signal: this.ac.signal });
  }

  public getById(id: string) {
    return this.api.volunteer.getById.query(id);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public update(id: string, data: UpdateVolunteerEventType) {
    return this.api.volunteer.update.mutate({ id, data });
  }

  public checkSlugUnique(slug: string, excludeId?: string | null) {
    return this.api.volunteer.checkSlugUnique.query({ slug, excludeId });
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Volunteer export is not available'));
  }
}
