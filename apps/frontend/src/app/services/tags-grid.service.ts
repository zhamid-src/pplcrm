import { Injectable } from '@angular/core';
import { AddTagType, UpdateTagType } from '@common';
import { TableType } from 'common/src/lib/kysely.models';
import { BaseGridService } from './base-grid.service';

type TYPE = TableType['tags'];
export type TAGTYPE = TYPE;

@Injectable({
  providedIn: 'root',
})
export class TagsGridService extends BaseGridService<TYPE, AddTagType> {
  public add(tag: AddTagType) {
    return this.api.tags.add.mutate(tag);
  }
  public delete(id: number): Promise<boolean> {
    return this.delete(id);
  }
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public findOne(id: number) {
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

  public update(id: number, data: UpdateTagType) {
    return this.api.tags.update.mutate({ id, data });
  }
}
