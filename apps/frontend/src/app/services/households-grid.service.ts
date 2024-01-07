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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public deleteMany(ids: number[]) {
    return Promise.resolve(true); // TODO: implement
    // return this.api.households.deleteMany.mutate(ids);
  }

  public findOne(id: number) {
    return this.api.households.findOne.query(id);
  }

  public refresh() {
    return this.getAllWithPeopleCount();
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
