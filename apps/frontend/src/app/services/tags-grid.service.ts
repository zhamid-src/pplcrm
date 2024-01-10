import { Injectable } from '@angular/core';
import { AddTagType, UpdateTagType } from '@common';
import { BaseGridService } from './base-grid.service';

@Injectable({
  providedIn: 'root',
})
export class TagsGridService extends BaseGridService<'tags', AddTagType> {
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }

  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public delete(id: bigint): Promise<boolean> {
    return this.delete(id);
  }

  public findOne(id: bigint) {
    return this.api.tags.findOne.query(BigInt(id));
  }

  public getAll() {
    return this.api.tags.findAll.query(undefined, {
      signal: this.ac.signal,
    });
  }

  public refresh() {
    return this.getAll();
  }

  public update(id: bigint, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id, data });
  }
}
