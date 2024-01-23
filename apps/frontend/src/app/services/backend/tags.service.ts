import { Injectable } from '@angular/core';
import { AddTagType, UpdateTagType } from '@common';
import { Tags } from 'common/src/lib/kysely.models';
import { AbstractBackendService } from './abstract.service';

/**
 * @see @link{AbstractBackendService} for more information about this class.
 */
@Injectable({
  providedIn: 'root',
})
export class TagsBackendService extends AbstractBackendService<'tags', AddTagType> {
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }

  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.tags.delete.mutate(id.toString())) !== null;
  }

  public findByName(name: string) {
    return this.api.tags.findByName.query(name);
  }

  public getAll() {
    return this.api.tags.getAll.query(undefined, {
      signal: this.ac.signal,
    });
  }

  public getById(id: string) {
    return this.api.tags.getById.query(id.toString());
  }

  /**
   * For tags, this is the same as getAll.
   * @returns
   */
  public async getDistinctTags() {
    const tags = (await this.getAll()) as Tags[];
    return tags.map((tag: Tags) => tag.name);
  }

  public async getTags(id: string) {
    const tag = (await this.getById(id)) as Tags;
    return [tag.name];
  }

  public update(id: string, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id: id.toString(), data });
  }
}
