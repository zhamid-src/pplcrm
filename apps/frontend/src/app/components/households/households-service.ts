import { Injectable } from '@angular/core';
import { UpdateHouseholdsType } from '@common';

import { AbstractAPIService } from '../../abstract.service';

/**
 * Service responsible for managing household data.
 * Communicates with the backend via TRPC for CRUD operations on households.
 *
 * @see {@link AbstractAPIService}
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdsService extends AbstractAPIService<'households', never> {
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
  public attachTag(id: string, tag_name: string) {
    return this.api.households.attachTag.mutate({ id: id, tag_name });
  }

  /**
   * Delete a household by ID.
   * @param id Household ID.
   * @returns A promise resolving to true if deletion was successful.
   */
  public async delete(id: string): Promise<boolean> {
    return (await this.api.households.delete.mutate(id)) !== null;
  }

  /**
   * Delete multiple households by IDs.
   * @param ids Array of household IDs.
   * @returns A promise resolving to true if deletion was successful.
   */
  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.households.deleteMany.mutate(ids)) !== null;
  }

  /**
   * Detach a tag from a household.
   * @param id Household ID.
   * @param tag_name Tag to remove.
   * @returns A promise for the mutation.
   */
  public detachTag(id: string, tag_name: string) {
    return this.api.households.detachTag.mutate({ id: id, tag_name });
  }

  /**
   * Retrieve all households with their people count.
   * @returns A promise resolving to the list of households.
   */
  public getAll() {
    return this.getAllWithPeopleCount();
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
  public async getTags(id: string) {
    const tags = await this.api.households.getTags.query(id);
    return tags.map((tag) => tag.name);
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
  private getAllWithPeopleCount() {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
  }
}
