import { Injectable } from '@angular/core';
import { TableType } from 'common/src/lib/kysely.models';
import { BaseGridService } from './base-grid.service';

export type TYPE = TableType['households'];

@Injectable({
  providedIn: 'root',
})
export class HouseholdsGridService extends BaseGridService<TYPE, never> {
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }
  public findOne(id: number) {
    return this.api.households.findOne.query(id);
  }
  public refresh() {
    return this.getAllWithPeopleCount();
  }
  public delete(id: number): Promise<boolean> {
    return this.delete(id);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  public update(id: number, data: any) {
    // TODO implement
    return Promise.resolve([]);
  }

  private getAllWithPeopleCount() {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
  }
}
