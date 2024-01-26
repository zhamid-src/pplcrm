import { Injectable } from '@angular/core';
import { UpdatePersonsType, getAllOptionsType } from '@common';
import { AbstractAPIService } from './abstract.service';

export type TYPE = 'persons' | 'households';

/**
 * @see @link{AbstractBackendService} for more information about this class.
 */
@Injectable({
  providedIn: 'root',
})
export class PersonsService extends AbstractAPIService<TYPE, UpdatePersonsType> {
  public add(row: UpdatePersonsType) {
    return this.api.persons.add.mutate(row);
  }

  public addMany(rows: UpdatePersonsType[]) {
    return Promise.resolve(rows);
  }

  public addTag(id: string, tag_name: string) {
    return this.api.persons.addTag.mutate({ id: id, tag_name });
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.persons.delete.mutate(id)) !== null;
  }
  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.persons.deleteMany.mutate(ids)) !== null;
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithAddress(options);
  }

  public getByHouseholdId(id: string, options?: getAllOptionsType) {
    return this.api.persons.getByHouseholdId.query({ id: id, options });
  }

  public getById(id: string) {
    return this.api.persons.getById.query(id);
  }

  public async getTags(id: string) {
    const tags = await this.api.persons.getTags.query(id);
    return tags.map((tag) => tag.name);
  }

  public removeTag(id: string, tag_name: string) {
    return this.api.persons.removeTag.mutate({ id: id, tag_name });
  }

  public async update(id: string, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id: id, data });
  }

  private getAllWithAddress(options?: getAllOptionsType) {
    return this.api.persons.getAllWithAddress.query(options, {
      signal: this.ac.signal,
    });
  }
}
