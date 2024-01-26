import { Injectable } from '@angular/core';
import { UpdateHouseholdsType } from '@common';
import { AbstractAPIService } from './abstract.service';

/**
 * @see @link{AbstractBackendService} for more information about this class.
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdsService extends AbstractAPIService<'households', never> {
  public add(household: UpdateHouseholdsType) {
    return this.api.households.add.mutate(household);
  }

  public override addMany(rows: never[]): Promise<unknown> {
    return Promise.resolve(rows);
  }

  public addTag(id: string, tag_name: string) {
    return this.api.households.addTag.mutate({ id: id, tag_name });
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.households.delete.mutate(id)) !== null;
  }
  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.households.deleteMany.mutate(ids)) !== null;
  }

  public getAll() {
    return this.getAllWithPeopleCount();
  }

  public getById(id: string) {
    return this.api.households.getById.query(id);
  }

  public async getTags(id: string) {
    const tags = await this.api.households.getTags.query(id);
    return tags.map((tag) => tag.name);
  }

  public removeTag(id: string, tag_name: string) {
    return this.api.households.removeTag.mutate({ id: id, tag_name });
  }

  public update(id: string, data: UpdateHouseholdsType) {
    return this.api.households.update.mutate({ id: id, data });
  }

  private getAllWithPeopleCount() {
    return this.api.households.getAllWithPeopleCount.query(undefined, {
      signal: this.ac.signal,
    });
  }
}
