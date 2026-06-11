/**
 * @file Service responsible for managing household data via tRPC.
 */
import { Service } from '@angular/core';
import { ExportCsvInputType, ExportCsvResponseType, UpdateHouseholdsType, getAllOptionsType } from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

/**
 * Service responsible for managing household data.
 * Communicates with the backend via TRPC for CRUD operations on households.
 *
 * @see {@link AbstractAPIService}
 */
@Service()
export class HouseholdsService extends AbstractAPIService<'households', never> {
  protected override readonly endpointName = 'households';

  /**
   * Add a new household to the database.
   * @param household The household data to be added.
   * @returns A promise resolving with the created household.
   */
  public add(household: UpdateHouseholdsType) {
    return this.api.households.add.mutate(household);
  }

  /**
   * Stubbed override for bulk add (not used here).
   * @param rows Unused input.
   * @returns A resolved promise.
   */
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  /**
   * Attach a tag to a household.
   * @param id Household ID.
   * @param tag_name Tag to attach.
   * @returns A promise for the mutation.
   */
  public attachTag(id: string, tag_name: string, type?: 'tag' | 'issue') {
    return this.api.households.attachTag.mutate({ id: id, tag_name, type });
  }

  /**
   * Retrieve the total number of households.
   * @returns Promise resolving to household count
   */
  public count(): Promise<number> {
    return this.api.households.count.query();
  }

  /**
   * Detach a tag from a household.
   * @param id Household ID.
   * @param tag_name Tag to remove.
   * @returns A promise for the mutation.
   */
  public detachTag(id: string, tag_name: string, type?: 'tag' | 'issue') {
    return this.api.households.detachTag.mutate({ id: id, tag_name, type });
  }

  /**
   * Retrieve all households with their people count.
   * @returns A promise resolving to the list of households.
   */
  public getAll(options?: getAllOptionsType) {
    return this.getAllWithPeopleCount(options);
  }

  // We don't support archives
  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  /**
   * Get a single household by ID.
   * @param id Household ID.
   * @returns A promise resolving to the household.
   */
  public getById(id: string) {
    return this.api.households.getById.query(id);
  }

  /**
   * Retrieve all tags attached to a household.
   * @param id Household ID.
   * @returns A promise resolving to an array of tag names.
   */
  public async getTags(id: string, type?: 'tag' | 'issue') {
    const tags = await this.api.households.getTags.query({ id, type });
    return tags.map((tag: { name: string }) => tag.name);
  }

  /**
   * Retrieve the number of people associated with a household.
   * @param id Household ID.
   * @returns Promise resolving to the people count.
   */
  public getPeopleCount(id: string) {
    return this.api.households.getPeopleCount.query(id);
  }

  /**
   * Update a household record.
   * @param id Household ID.
   * @param data Updated household data.
   * @returns A promise for the mutation.
   */
  public update(id: string, data: UpdateHouseholdsType) {
    return this.api.households.update.mutate({ id: id, data });
  }

  /**
   * Internal helper to retrieve households with people count.
   * Uses AbortController signal to allow cancellation.
   * @returns A promise resolving to the household data.
   */
  private async getAllWithPeopleCount(options?: getAllOptionsType) {
    return this.api.households.getAllWithPeopleCount.query(options, {
      signal: this.ac.signal,
    });
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.households.exportCsv.mutate(input);
  }

  /**
   * Find potential duplicate households.
   */
  public findPotentialDuplicates(): Promise<any[]> {
    return this.api.households.findPotentialDuplicates.query();
  }

  /**
   * Merge source household into target household.
   */
  public mergeHouseholds(targetId: string, sourceId: string): Promise<any> {
    return this.api.households.mergeHouseholds.mutate({ target_id: targetId, source_id: sourceId });
  }

  /**
   * Recompute address fingerprints for duplicate matching.
   */
  public recomputeAddressFingerprints(): Promise<void> {
    return this.api.households.recomputeAddressFingerprints.mutate();
  }
}
