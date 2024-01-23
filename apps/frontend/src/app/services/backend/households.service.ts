import { Injectable } from '@angular/core';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { AbstractBackendService } from './abstract.service';

/**
 * @see @link{AbstractBackendService} for more information about this class.
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdsBackendService extends AbstractBackendService<'households', never> {
  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public delete(id: string): Promise<boolean> {
    return this.delete(id);
  }

  public getAll() {
    return this.getAllWithPeopleCount();
  }

  public getById(id: string) {
    return this.api.households.getById.query(id);
  }

  public async getDistinctTags() {
    const tags = await this.api.households.getDistinctTags.query();
    return tags.map((tag) => tag.name);
  }

  public async getTags(id: string) {
    const tags = await this.api.households.getTags.query(id);
    return tags.map((tag) => tag.name);
  }

  public update(id: string, data: OperationDataType<'households', 'insert'>) {
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
