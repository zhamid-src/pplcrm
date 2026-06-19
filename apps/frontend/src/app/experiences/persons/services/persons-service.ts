/**
 * @fileoverview Service for managing person records and related operations.
 * Provides comprehensive CRUD operations, tag management, and household relationships
 * through type-safe tRPC communication with the backend.
 */
import { Service } from '@angular/core';
import {
  ExportCsvInputType,
  ExportCsvResponseType,
  PERSONINHOUSEHOLDTYPE,
  UpdatePersonsType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { RouterInputs, RouterOutputs } from '../../../services/api/trpc-types';

/**
 * Manages Person records and their relationships to Households, Addresses, and Tags.
 * * Note: Relationships are structured as:
 * - Person ↔ Household (many-to-one)
 * - Person ↔ Tags (many-to-many)
 */
@Service()
export class PersonsService extends AbstractAPIService<DATA_TYPE, UpdatePersonsType> {
  protected override readonly endpointName = 'persons';

  /**
   * Add a single person record to the backend.
   *
   * @param row - Person data to be added
   * @returns A promise resolving to the result of the mutation
   */
  public add(row: UpdatePersonsType, options?: any) {
    return this.api.persons.add.mutate(row, options);
  }

  /**
   * Add multiple person records.
   *
   * This implementation currently resolves the input as-is.
   * You can override it with an actual implementation if batch insert is supported.
   *
   * @param rows - Array of person data
   */
  public addMany(rows: UpdatePersonsType[]) {
    return Promise.resolve(rows);
  }

  /**
   * Attach a tag to a person.
   *
   * @param id - Person ID
   * @param tag_name - Tag to attach
   */
  public attachTag(id: string, tag_name: string, type?: 'tag' | 'issue') {
    return this.api.persons.attachTag.mutate({ id: id, tag_name, type });
  }

  /**
   * Retrieve the total number of people.
   * @returns Promise resolving to count of persons
   */
  public count(): Promise<number> {
    return this.api.persons.count.query();
  }

  /**
   * Delete a person by ID.
   *
   * @param id - Person ID
   * @param force - Force deletion cascadingly
   * @param skipAlert - Skip global error alerts
   * @returns True if deleted, false otherwise
   */
  public override async delete(id: string, force?: boolean, skipAlert = false): Promise<boolean> {
    const opts = skipAlert ? { meta: { skipErrorHandler: true } } : undefined;
    if (force !== undefined) {
      return (await (this.api.persons.delete.mutate as any)({ id, force }, opts)) !== null;
    }
    return (await (this.api.persons.delete.mutate as any)(id, opts)) !== null;
  }

  /**
   * Delete multiple people by their IDs.
   *
   * @param ids - Array of person IDs
   * @param force - Force deletion cascadingly
   * @param skipAlert - Skip global error alerts
   * @returns True if deletion was successful
   */
  public override async deleteMany(ids: string[], force?: boolean, skipAlert = false): Promise<boolean> {
    const opts = skipAlert ? { meta: { skipErrorHandler: true } } : undefined;
    if (force !== undefined) {
      return await (this.api.persons.deleteMany.mutate as any)({ ids, force }, opts);
    }
    return await (this.api.persons.deleteMany.mutate as any)(ids, opts);
  }

  public moveEntireHousehold(fromHouseholdId: string, toHouseholdId: string) {
    return this.api.persons.moveEntireHousehold.mutate({ fromHouseholdId, toHouseholdId });
  }

  /**
   * Detach a tag from a person.
   *
   * @param id - Person ID
   * @param tag_name - Tag to detach
   */
  public detachTag(
    id: string,
    tag_name: string,
    type?: 'tag' | 'issue',
  ): Promise<RouterOutputs['persons']['detachTag']> {
    return this.api.persons.detachTag.mutate({ id, tag_name, type });
  }

  /**
   * Get all persons, including address information.
   *
   * @param options - Optional query filters
   */
  public getAll(options?: getAllOptionsType) {
    return this.getAllWithAddress(options);
  }

  // We don't support archives
  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  /**
   * Get all persons along with their associated address.
   *
   * @param options - Optional filters
   */
  public async getAllWithAddress(options?: getAllOptionsType) {
    return this.api.persons.getAllWithAddress.query(options, {
      signal: this.ac.signal,
    });
  }

  /**
   * Get all people in a household by ID with optional filtering.
   *
   * @param id - Household ID
   * @param options - Optional query options
   */
  public getByHouseholdId(id: string, options?: getAllOptionsType) {
    return this.api.persons.getByHouseholdId.query({ id: id, options });
  }

  public getByCompanyId(id: string, options?: getAllOptionsType) {
    return this.api.persons.getByCompanyId.query({ id: id, options });
  }

  /** Return a scalar count of persons in a company without fetching all rows. */
  public countByCompanyId(id: string): Promise<number> {
    return this.api.persons.countByCompanyId.query({ id });
  }

  /**
   * Get a single person by ID.
   *
   * @param id - Person ID
   */
  public getById(id: string) {
    return this.api.persons.getById.query(id);
  }

  /**
   * Fetches people in a household and appends a computed `full_name`.
   * @note Optimized to only fetch columns necessary for name computation.
   */
  public async getPeopleInHousehold(id: string | null | undefined, options?: getAllOptionsType) {
    if (!id) {
      return [];
    }

    const requiredColumns = ['id', 'first_name', 'middle_names', 'last_name'];
    const mergedColumns = Array.from(new Set([...(options?.columns ?? []), ...requiredColumns]));
    const requestOptions = {
      ...options,
      columns: mergedColumns,
    };

    const peopleInHousehold = (await this.getByHouseholdId(id, requestOptions)) as PERSONINHOUSEHOLDTYPE[];

    return peopleInHousehold.map((person) => {
      return {
        ...person,
        full_name: `${person.first_name || ''} ${person.middle_names || ''} ${person.last_name || ''}`.trim(),
      };
    });
  }

  /**
   * Get transactional emails and newsletter activities for a person.
   */
  public getActivity(id: string) {
    return this.api.persons.getActivity.query(id);
  }

  /**
   * Get tags for a person.
   *
   * @param id - Person ID
   * @returns Array of tag names
   */
  public async getTags(id: string, type?: 'tag' | 'issue') {
    const tags = await this.api.persons.getTags.query({ id, type });
    return tags.map((tag: { name: string }) => tag.name);
  }

  /**
   * Import multiple people with optional common tags.
   * Accepts already-mapped/sanitized-like raw fields; backend runs final validation.
   */
  public import(
    rows: RouterInputs['persons']['import']['rows'],
    tags: string[] = [],
    skipped = 0,
    fileName?: string | null,
  ): Promise<RouterOutputs['persons']['import']> {
    // Opt-out of global error toast; importer UI shows a scoped summary instead
    return this.api.persons.import.mutate(
      { rows, tags, skipped, file_name: fileName },
      {
        meta: { skipErrorHandler: true },
      },
    );
  }

  /**
   * Remove the current household/address by moving the person
   * to a new blank household handled in the backend repo.
   *
   * @param id - Person ID
   */
  public async removeHousehold(id: string) {
    return this.api.persons.removeHousehold.mutate(id);
  }

  /**
   * Update a person’s data.
   *
   * @param id - Person ID
   * @param data - New data to apply
   */
  public async update(id: string, data: UpdatePersonsType, options?: any) {
    console.log(id, data);
    return this.api.persons.update.mutate({ id: id, data }, options);
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.persons.exportCsv.mutate(input);
  }

  public getPotentialDuplicates(
    options?: RouterInputs['persons']['getPotentialDuplicates'],
  ): Promise<RouterOutputs['persons']['getPotentialDuplicates']> {
    return this.api.persons.getPotentialDuplicates.query(options);
  }

  public getDuplicateCounts(): Promise<RouterOutputs['persons']['getDuplicateCounts']> {
    return this.api.persons.getDuplicateCounts.query();
  }

  /**
   * Merge a source duplicate contact into a target primary contact.
   */
  public mergePersons(target_id: string, source_id: string): Promise<RouterOutputs['persons']['mergePersons']> {
    return this.api.persons.mergePersons.mutate({ target_id, source_id });
  }
}

export type DATA_TYPE = 'persons' | 'households';
