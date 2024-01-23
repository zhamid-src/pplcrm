import { Injectable } from '@angular/core';
import { UpdatePersonsType, getAllOptionsType } from '@common';
import { AbstractBackendService } from './abstract.service';

export type TYPE = 'persons' | 'households';

/**
 * @see @link{AbstractBackendService} for more information about this class.
 */
@Injectable({
  providedIn: 'root',
})
export class PersonsBackendService extends AbstractBackendService<TYPE, UpdatePersonsType> {
  public add(row: UpdatePersonsType) {
    return this.api.persons.add.mutate(row);
  }

  public addMany(rows: UpdatePersonsType[]) {
    return Promise.resolve(rows);
  }

  public async delete(id: bigint): Promise<boolean> {
    return (await this.api.persons.delete.mutate(id.toString())) !== null;
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithAddress(options);
  }

  public getByHouseholdId(id: bigint | string, options?: getAllOptionsType) {
    return this.api.persons.getByHouseholdId.query({ id: id.toString(), options });
  }

  public getById(id: bigint | string) {
    return this.api.persons.getById.query(id.toString());
  }

  public async getDistinctTags() {
    const tags = await this.api.persons.getDistinctTags.query();
    return tags.map((tag) => tag.name);
  }

  public addTag(id: bigint | string, tag_name: string) {
    return this.api.persons.addTag.mutate({ id: id.toString(), tag_name });
  }

  public async getTags(id: bigint | string) {
    const tags = await this.api.persons.getTags.query(id.toString());
    return tags.map((tag) => tag.name);
  }

  public async update(id: bigint | string, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id: id.toString(), data });
  }

  private getAllWithAddress(options?: getAllOptionsType) {
    return this.api.persons.getAllWithAddress.query(options, {
      signal: this.ac.signal,
    });
  }
}
