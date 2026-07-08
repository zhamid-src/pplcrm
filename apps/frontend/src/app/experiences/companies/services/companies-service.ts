import { Service } from '@angular/core';
import { ExportCsvInputType, ExportCsvResponseType, getAllOptionsType } from '../../../../../../../libs/common/src';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { RouterInputs, RouterOutputs } from '../../../services/api/trpc-types';

@Service()
export class CompaniesService extends AbstractAPIService<'companies', any> {
  protected override readonly endpointName = 'companies';

  public add(row: RouterInputs['companies']['add']) {
    return this.api.companies.add.mutate(row);
  }

  public addMany(rows: RouterInputs['companies']['add'][]) {
    return Promise.resolve(rows);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.companies.count.query();
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

  public getById(id: string): Promise<any> {
    return this.api.companies.getById.query(id);
  }

  /** Tenant-scoped slug resolution for /companies/:slug URLs (spec §1). */
  public getBySlug(slug: string) {
    return this.api.companies.getBySlug.query(slug);
  }

  /** §7 "Enrich" / "Re-check Google" — queues a Google Places lookup background job. */
  public enrich(id: string, force = false): Promise<RouterOutputs['companies']['enrich']> {
    return this.api.companies.enrich.mutate({ id, force });
  }

  /** Add-time preview: fetch Google Places fields for a name without persisting. */
  public lookupEnrichment(name: string): Promise<RouterOutputs['companies']['lookupEnrichment']> {
    return this.api.companies.lookupEnrichment.mutate({ name });
  }

  /** Advisory duplicate-name check for the add/edit form (case-insensitive, tenant-scoped). */
  public checkNameExists(name: string, excludeId?: string): Promise<RouterOutputs['companies']['nameExists']> {
    return this.api.companies.nameExists.query({ name, excludeId });
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public async update(id: string, data: RouterInputs['companies']['update']['data']) {
    return this.api.companies.update.mutate({ id, data });
  }

  public import(rows: any[], skipped: number, file_name?: string): Promise<RouterOutputs['companies']['import']> {
    return this.api.companies.import.mutate({ rows, skipped, file_name });
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.companies.exportCsv.mutate(input);
  }

  public getPotentialDuplicates(
    options?: RouterInputs['companies']['getPotentialDuplicates'],
  ): Promise<RouterOutputs['companies']['getPotentialDuplicates']> {
    return this.api.companies.getPotentialDuplicates.query(options);
  }

  public mergeCompanies(targetId: string, sourceId: string): Promise<RouterOutputs['companies']['mergeCompanies']> {
    return this.api.companies.mergeCompanies.mutate({ target_id: targetId, source_id: sourceId });
  }
}
