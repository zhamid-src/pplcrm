import { Service } from '@angular/core';
import { ExportCsvInputType, ExportCsvResponseType, getAllOptionsType } from '@common';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class CompaniesService extends AbstractAPIService<'companies', any> {
  public add(row: any) {
    return this.api.companies.add.mutate(row);
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
    return (await this.api.companies.delete.mutate(id)) !== null;
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    return await this.api.companies.deleteMany.mutate(ids);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(true);
  }

  public async getAll(options?: getAllOptionsType) {
    return this.api.companies.getAll.query(options, {
      signal: this.ac.signal,
    });
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string) {
    return this.api.companies.getById.query(id);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public async update(id: string, data: any) {
    return this.api.companies.update.mutate({ id, data });
  }

  public import(rows: any[], skipped: number, file_name?: string) {
    return this.api.companies.import.mutate({ rows, skipped, file_name });
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.companies.exportCsv.mutate(input);
  }

  /**
   * Find potential duplicate companies.
   */
  public findPotentialDuplicates(): Promise<any[]> {
    return this.api.companies.findPotentialDuplicates.query();
  }

  /**
   * Merge source company into target company.
   */
  public mergeCompanies(targetId: string, sourceId: string): Promise<any> {
    return this.api.companies.mergeCompanies.mutate({ target_id: targetId, source_id: sourceId });
  }
}
