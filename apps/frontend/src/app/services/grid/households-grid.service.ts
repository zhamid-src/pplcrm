import { Injectable } from '@angular/core';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { AbstractGridService } from './abstract-grid.service';

@Injectable({
  providedIn: 'root',
})
export class HouseholdsGridService extends AbstractGridService<'households', never> {
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public delete(id: bigint): Promise<boolean> {
    return this.delete(id);
  }

  public findOne(id: bigint) {
    return this.api.households.findOne.query(id.toString());
  }

  public refresh() {
    return this.getAllWithPeopleCount();
  }

  public update(id: bigint, data: OperationDataType<'households', 'insert'>) {
    console.log(id, data);
    // TODO implement
    return Promise.resolve([]);
  }

  private getAllWithPeopleCount() {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
  }
}
