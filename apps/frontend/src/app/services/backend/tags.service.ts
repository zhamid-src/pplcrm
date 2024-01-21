import { Injectable } from '@angular/core';
import { AddTagType, UpdateTagType } from '@common';
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

  public async delete(id: bigint): Promise<boolean> {
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

  public getByPersonId(id: bigint | string) {
    return this.api.tags.getByPersonId.query(id.toString());
  }
  public getByHouseholdId(id: bigint | string) {
    return this.api.tags.getbyHouseholdId.query(id.toString());
  }

  public getById(id: bigint) {
    return this.api.tags.getById.query(id.toString());
  }

  public update(id: bigint, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id: id.toString(), data });
  }
}
