import { Injectable } from '@angular/core';
import { PERSONINHOUSEHOLDTYPE, UpdatePersonsType, getAllOptionsType } from '@common';
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

  public attachTag(id: string, tag_name: string) {
    return this.api.persons.attachTag.mutate({ id: id, tag_name });
  }

  public async delete(id: string): Promise<boolean> {
    return (await this.api.persons.delete.mutate(id)) !== null;
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    return (await this.api.persons.deleteMany.mutate(ids)) !== null;
  }

  public detachTag(id: string, tag_name: string) {
    return this.api.persons.detachTag.mutate({ id: id, tag_name });
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithAddress({ options });
  }

  public getAllWithAddress(input: { tags?: string[]; options?: getAllOptionsType }) {
    return this.api.persons.getAllWithAddress.query(
      { options: input.options, tags: input.tags },
      {
        signal: this.ac.signal,
      },
    );
  }
  public async getPeopleInHousehold(id: string | null | undefined) {
    if (!id) {
      return [];
    }
    const peopleInHousehold = (await this.getByHouseholdId(id, {
      columns: ['id', 'first_name', 'middle_names', 'last_name'],
    })) as PERSONINHOUSEHOLDTYPE[];

    return peopleInHousehold.map((person) => {
      return {
        ...person,
        full_name: `${person.first_name} ${person.middle_names} ${person.last_name}`,
      };
    });
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

  public async update(id: string, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id: id, data });
  }
}
