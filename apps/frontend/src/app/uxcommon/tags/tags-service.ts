import { Injectable } from '@angular/core';
import { AddTagType, UpdateTagType } from '@common';

import { AbstractAPIService } from '../../abstract.service';
import { Tags } from 'common/src/lib/kysely.models';

/**
 * `TagsService` handles all CRUD operations and utility methods for managing tags
 * in the application. It communicates with the backend via TRPC.
 *
 * Extends `AbstractAPIService` to inherit standard CRUD operations.
 */
@Injectable({
  providedIn: 'root',
})
export class TagsService extends AbstractAPIService<'tags', AddTagType> {
  /**
   * Adds a new tag to the backend.
   *
   * @param tag - The tag object to add.
   * @returns A Promise resolving with the result of the mutation.
   */
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }

  /**
   * (No-op implementation)
   * Required override for abstract method.
   *
   * @param rows - Rows to add (unused).
   * @returns A resolved Promise with the input rows.
   */
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  /**
   * Attaches a tag to a given ID by adding it if it doesn't exist.
   *
   * @param id - The ID of the item (unused in this context).
   * @param tag_name - The name of the tag to attach.
   */
  public async attachTag(_id: string, tag_name: string) {
    await this.add({ name: tag_name });
  }

  /**
   * Deletes a tag by ID.
   *
   * @param id - The ID of the tag to delete.
   * @returns `true` if successful, otherwise `false`.
   */
  public async delete(id: string): Promise<boolean> {
    return (await this.api.tags.delete.mutate(id)) !== null;
  }

  /**
   * Deletes multiple tags by their IDs.
   *
   * @param ids - The array of tag IDs to delete.
   * @returns `true` if deletion was successful, otherwise `false`.
   */
  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.tags.deleteMany.mutate(ids)) !== null;
  }

  /**
   * Detaches a tag by deleting it.
   *
   * @param id - The ID of the tag to detach.
   * @returns A Promise that resolves once the tag is deleted.
   */
  public detachTag(id: string) {
    return this.delete(id);
  }

  /**
   * Filters tags by partial match on name.
   *
   * @param key - The search key.
   * @returns A Promise resolving to a list of matching tag names.
   */
  public async filter(key: string) {
    const names = (await this.findByName(key)) as AddTagType[];
    return names.map((m) => m.name);
  }

  /**
   * Searches for tags that match a given name.
   *
   * @param name - Partial or full name to match.
   * @returns A Promise resolving with the matching tags.
   */
  public findByName(name: string) {
    return this.api.tags.findByName.query(name);
  }

  /**
   * Returns all tags along with how many times each tag is used.
   *
   * @returns A Promise resolving to the list of tags with usage counts.
   */
  public getAll() {
    return this.getAllWithCounts();
  }

  /**
   * Gets all tags along with metadata like usage count.
   *
   * @returns A Promise resolving with enriched tag data.
   */
  public getAllWithCounts() {
    return this.api.tags.getAllWithCounts.query();
  }

  /**
   * Gets a single tag by its ID.
   *
   * @param id - The ID of the tag.
   * @returns A Promise resolving with the tag object.
   */
  public getById(id: string) {
    return this.api.tags.getById.query(id);
  }

  /**
   * Returns an array of tag names for a given tag ID.
   *
   * @param id - The tag ID.
   * @returns A Promise resolving with an array containing the tag name.
   */
  public async getTags(id: string) {
    const tag = (await this.getById(id)) as Tags;
    return [tag.name];
  }

  /**
   * Updates an existing tag.
   *
   * @param id - The ID of the tag to update.
   * @param data - The updated tag data.
   * @returns A Promise resolving with the result of the mutation.
   */
  public update(id: string, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id: id, data });
  }
}
