/**
 * @fileoverview Service for managing person records and related operations.
 * Provides comprehensive CRUD operations, tag management, and household relationships
 * through type-safe tRPC communication with the backend.
 */
import { Injectable } from '@angular/core';
import { PERSONINHOUSEHOLDTYPE, UpdatePersonsType, getAllOptionsType } from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

/**
 * Service for comprehensive person record management in the CRM system.
 *
 * This service extends AbstractAPIService to provide specialized functionality for
 * managing person records, including their relationships with households, addresses,
 * and tags. It offers both individual and batch operations with full type safety.
 *
 * **Key Features:**
 * - **Person Management**: Full CRUD operations for person records
 * - **Household Integration**: Retrieve people by household relationships
 * - **Address Support**: Include address information in person queries
 * - **Tag Management**: Attach/detach tags for categorization
 * - **Batch Operations**: Support for multiple record operations
 * - **Advanced Queries**: Flexible filtering and column selection
 *
 * **Data Relationships:**
 * - Person ↔ Household (many-to-one)
 * - Person ↔ Address (through household)
 * - Person ↔ Tags (many-to-many)
 *
 * @example
 * ```typescript
 * constructor(private personsService: PersonsService) {}
 *
 * // Get all persons with addresses
 * const persons = await this.personsService.getAllWithAddress({
 *   limit: 10,
 *   orderBy: 'last_name'
 * });
 *
 * // Get people in a specific household
 * const householdMembers = await this.personsService.getPeopleInHousehold('household-123');
 *
 * // Add a new person
 * const newPerson = await this.personsService.add({
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   email: 'john@example.com'
 * });
 * ```
 *
 * @extends AbstractAPIService<DATA_TYPE, UpdatePersonsType>
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

  /**
   * Get a single person by ID.
   *
   * @param id - Person ID
   */
  public getById(id: string) {
    return this.api.persons.getById.query(id);
  }

  /**
   * Retrieves all people in a household with computed full names.
   *
   * This method fetches people associated with a specific household and enhances
   * the data by computing a full name from the individual name components. It's
   * optimized to only fetch the necessary columns for name computation.
   *
   * **Data Enhancement:**
   * - Combines first_name, middle_names, and last_name into full_name
   * - Handles null/undefined name components gracefully
   * - Returns empty array for invalid household IDs
   *
   * @param id - The household ID to fetch people for (null/undefined returns empty array)
   * @returns Promise resolving to array of people with computed full_name property
   *
   * @example
   * ```typescript
   * const householdMembers = await this.personsService.getPeopleInHousehold('household-123');
   * householdMembers.forEach(person => {
   *   console.log(`${person.full_name} (ID: ${person.id})`);
   * });
   * ```
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
        full_name: `${person.first_name || ''} ${person.middle_names || ''} ${person.last_name || ''}`.trim(),
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
    return tags.map((tag: { name: string }) => tag.name);
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
