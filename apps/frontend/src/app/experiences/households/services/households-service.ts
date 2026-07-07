import { Service } from '@angular/core';
import {
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateHouseholdsType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class HouseholdsService extends AbstractAPIService<'households', never> {
  protected override readonly endpointName = 'households';

  public add(household: UpdateHouseholdsType) {
    return this.api.households.add.mutate(household);
  }

  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public attachTag(id: string, tag_name: string, type?: 'tag' | 'issue') {
    return this.api.households.attachTag.mutate({ id: id, tag_name, type });
  }

  public count(): Promise<number> {
    return this.api.households.count.query();
  }

  /** Distinct geocoded wards — powers the "{n} households across {m} wards" grain sentence. */
  public countDistinctWards(): Promise<number> {
    return this.api.households.countDistinctWards.query();
  }

  /** Tenant-scoped slug resolution for /households/:slug URLs (spec §1). */
  public getBySlug(slug: string) {
    return this.api.households.getBySlug.query(slug);
  }

  public detachTag(id: string, tag_name: string, type?: 'tag' | 'issue') {
    return this.api.households.detachTag.mutate({ id: id, tag_name, type });
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithPeopleCount(options);
  }

  // We don't support archives
  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string) {
    return this.api.households.getById.query(id);
  }

  public async getTags(id: string, type?: 'tag' | 'issue') {
    const tags = await this.api.households.getTags.query({ id, type });
    return tags.map((tag: { name: string }) => tag.name);
  }

  public getPeopleCount(id: string) {
    return this.api.households.getPeopleCount.query(id);
  }

  public update(id: string, data: UpdateHouseholdsType) {
    return this.api.households.update.mutate({ id: id, data });
  }

  private async getAllWithPeopleCount(options?: getAllOptionsType) {
    return this.api.households.getAllWithPeopleCount.query(options, {
      signal: this.ac.signal,
    });
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.households.exportCsv.mutate(input);
  }

  public getPotentialDuplicates(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ groups: any[]; total: number }> {
    return this.api.households.getPotentialDuplicates.query(options);
  }

  public mergeHouseholds(targetId: string, sourceId: string): Promise<any> {
    return this.api.households.mergeHouseholds.mutate({ target_id: targetId, source_id: sourceId });
  }

  public getLastFingerprintRecomputation(): Promise<{ lastRunAt: string | null }> {
    return this.api.households.getLastFingerprintRecomputation.query();
  }

  public recomputeAddressFingerprints(): Promise<void> {
    return this.api.households.recomputeAddressFingerprints.mutate();
  }
}
