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
    return this.getAllWithHouseholds(options);
  }

  public getById(id: bigint) {
    return this.api.persons.getById.query(id.toString());
  }

  public async update(id: bigint, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id: id.toString(), data });
  }

  private getAllWithHouseholds(options?: getAllOptionsType) {
    return this.api.persons.getAllWithHouseholds.query(options, {
      signal: this.ac.signal,
    });
  }
}
