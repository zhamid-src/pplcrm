import { Injectable } from '@angular/core';
import { UpdateRow } from 'common/src/lib/kysely.models';
import { BaseGridService } from './base-grid.service';

@Injectable({
  providedIn: 'root',
})
export class HouseholdsGridService extends BaseGridService<'households', never> {
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
  public update(id: number, data: UpdateRow<'households'>) {
    // TODO implement
    return Promise.resolve([]);
  }

  private getAllWithPeopleCount() {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
  }
}
