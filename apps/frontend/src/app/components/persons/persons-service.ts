import { Injectable } from '@angular/core';
import { PERSONINHOUSEHOLDTYPE, UpdatePersonsType, getAllOptionsType } from '@common';

import { AbstractAPIService } from '../../abstract-api.service';

/**
 * Service for interacting with the `persons` data source.
 * Handles CRUD operations, tag management, and related utilities.
 *
 * @see {@link AbstractAPIService}
 */
@Injectable({
  providedIn: 'root',
})
export class PersonsService extends AbstractAPIService<DATA_TYPE, UpdatePersonsType> {
  /**
   * Add a single person record to the backend.
   *
   * @param row - Person data to be added
   * @returns A promise resolving to the result of the mutation
   */
  public add(row: UpdatePersonsType) {
    return this.api.persons.add.mutate(row);
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
  public attachTag(id: string, tag_name: string) {
    return this.api.persons.attachTag.mutate({ id: id, tag_name });
  }

  /**
   * Delete a person by ID.
   *
   * @param id - Person ID
   * @returns True if deleted, false otherwise
   */
  public async delete(id: string): Promise<boolean> {
    return (await this.api.persons.delete.mutate(id)) !== null;
  }

  /**
   * Delete multiple people by their IDs.
   *
   * @param ids - Array of person IDs
   * @returns True if deletion was successful
   */
  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.persons.deleteMany.mutate(ids)) !== null;
  }

  /**
   * Detach a tag from a person.
   *
   * @param id - Person ID
   * @param tag_name - Tag to detach
   */
  public detachTag(id: string, tag_name: string) {
    return this.api.persons.detachTag.mutate({ id: id, tag_name });
  }

  /**
   * Get all persons, including address information.
   *
   * @param options - Optional query filters
   */
  public getAll(options?: getAllOptionsType) {
    return this.getAllWithAddress(options);
  }

  /**
   * Get all persons along with their associated address.
   *
   * @param options - Optional filters
   */
  public getAllWithAddress(options?: getAllOptionsType) {
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

  /**
   * Get a single person by ID.
   *
   * @param id - Person ID
   */
  public getById(id: string) {
    return this.api.persons.getById.query(id);
  }

  /**
   * Get people associated with a specific household and return them
   * with their full name computed.
   *
   * @param id - Household ID
   * @returns Array of people with `full_name` field added
   */
  public async getPeopleInHousehold(id: string | null | undefined) {
    if (!id) {
      return [];
    }

    const peopleInHousehold = (await this.getByHouseholdId(id, {
      columns: ['id', 'first_name', 'middle_names', 'last_name'],
    })) as PERSONINHOUSEHOLDTYPE[];

    return peopleInHousehold.map((person) => {
      return {
        ...person,
        full_name: `${person.first_name || ''} ${person.middle_names || ''} ${person.last_name || ''}`,
      };
    });
  }

  /**
   * Get tags for a person.
   *
   * @param id - Person ID
   * @returns Array of tag names
   */
  public async getTags(id: string) {
    const tags = await this.api.persons.getTags.query(id);
    return tags.map((tag) => tag.name);
  }

  /**
   * Update a person’s data.
   *
   * @param id - Person ID
   * @param data - New data to apply
   */
  public async update(id: string, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id: id, data });
  }
}

export type DATA_TYPE = 'persons' | 'households';
