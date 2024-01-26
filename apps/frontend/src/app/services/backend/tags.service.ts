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

  public async addTag(id: string, tag_name: string) {
    await this.add({ name: tag_name });
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.tags.delete.mutate(id)) !== null;
  }
  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.tags.deleteMany.mutate(ids)) !== null;
  }

  public findByName(name: string) {
    return this.api.tags.findByName.query(name);
  }

  public getAll() {
    return this.getAllWithCounts();
  }

  public getById(id: string) {
    return this.api.tags.getById.query(id);
  }

  public async getTags(id: string) {
    const tag = (await this.getById(id)) as Tags;
    return [tag.name];
  }

  public removeTag(id: string) {
    return this.delete(id);
  }

  public update(id: string, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id: id, data });
  }

  public getAllWithCounts() {
    return this.api.tags.getAllWithCounts.query();
  }
}
