import { Injectable } from '@angular/core';
import { UpdatePersonsType, getAllOptionsType } from '@common';
import { BaseGridService } from './base-grid.service';

export type TYPE = 'persons' | 'households';

@Injectable({
  providedIn: 'root',
})
export class PersonsGridService extends BaseGridService<TYPE, UpdatePersonsType> {
  public addMany(rows: UpdatePersonsType[]) {
    return Promise.resolve(rows);
  }

  public async delete(id: bigint): Promise<boolean> {
    return (await this.api.persons.delete.mutate(id)) !== null;
  }

  public findOne(id: bigint) {
    return this.api.persons.findOne.query(id);
  }

  public refresh(options?: getAllOptionsType) {
    return this.getAllWithHouseholds(options);
  }

  public async update(id: bigint, data: UpdatePersonsType) {
    return this.api.persons.update.mutate({ id, data });
  }

  private getAllWithHouseholds(options?: getAllOptionsType) {
    return this.api.persons.getAllWithHouseholds.query(options, {
      signal: this.ac.signal,
    });
  }
}
