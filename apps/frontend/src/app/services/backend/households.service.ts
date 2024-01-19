import { Injectable } from '@angular/core';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { AbstractBackendService } from './abstract.service';

@Injectable({
  providedIn: 'root',
})
export class HouseholdsBackendService extends AbstractBackendService<'households', never> {
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public delete(id: bigint): Promise<boolean> {
    return this.delete(id);
  }

  public findAll() {
    return this.getAllWithPeopleCount();
  }

  public findOne(id: bigint) {
    return this.api.households.findOne.query(id.toString());
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
