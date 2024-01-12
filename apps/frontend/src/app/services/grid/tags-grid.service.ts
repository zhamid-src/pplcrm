import { Injectable } from '@angular/core';
import { AddTagType, UpdateTagType } from '@common';
import { AbstractGridService } from './abstract-grid.service';

@Injectable({
  providedIn: 'root',
})
export class TagsGridService extends AbstractGridService<'tags', AddTagType> {
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }

  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public async delete(id: bigint): Promise<boolean> {
    return (await this.api.tags.delete.mutate(id.toString())) !== null;
  }

  public findOne(id: bigint) {
    return this.api.tags.findOne.query(id.toString());
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
    return this.api.tags.update.mutate({ id: id.toString(), data });
  }
}
