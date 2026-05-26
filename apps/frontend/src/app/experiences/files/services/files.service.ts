import { Service } from '@angular/core';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { ExportCsvInputType, ExportCsvResponseType, getAllOptionsType } from '@common';

@Service()
export class FilesService extends AbstractAPIService<'files', any> {
  public add(_row: any) {
    return Promise.resolve({});
  }

  public addMany(rows: any[]) {
    return Promise.resolve(rows);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return Promise.resolve(0);
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.files.delete.mutate(id)) !== null;
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    return await this.api.files.deleteMany.mutate(ids);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(true);
  }

  public async getAll(options?: getAllOptionsType) {
    return this.api.files.getAll.query(options, {
      signal: this.ac.signal,
    });
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(_id: string) {
    return Promise.resolve(undefined);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public async update(_id: string, _data: any) {
    return Promise.resolve({});
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.resolve({ csv: '', columns: [], fileName: '', rowCount: 0 });
  }
}
