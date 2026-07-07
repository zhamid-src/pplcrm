import { Service } from '@angular/core';
import {
  ExportCsvInputType,
  ExportCsvResponseType,
  PERSONINHOUSEHOLDTYPE,
  UpdatePersonsType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { RouterInputs, RouterOutputs } from '../../../services/api/trpc-types';

@Service()
export class PersonsService extends AbstractAPIService<DATA_TYPE, UpdatePersonsType> {
  protected override readonly endpointName = 'persons';

  public add(row: UpdatePersonsType, options?: any) {
    return this.api.persons.add.mutate(row, options);
  }

  public addMany(rows: UpdatePersonsType[]) {
    return Promise.resolve(rows);
  }

  public attachTag(id: string, tag_name: string, type?: 'tag' | 'issue') {
    return this.api.persons.attachTag.mutate({ id: id, tag_name, type });
  }

  public count(): Promise<number> {
    return this.api.persons.count.query();
  }

  /** People linked to any company — powers the "{n} people in {m} companies" grain sentence. */
  public countWithCompany(): Promise<number> {
    return this.api.persons.countWithCompany.query();
  }

  /** Tenant-scoped slug resolution for /people/:slug URLs (spec §1). */
  public getBySlug(slug: string) {
    return this.api.persons.getBySlug.query(slug);
  }
  public override async delete(id: string, force?: boolean, skipAlert = false): Promise<boolean> {
    const opts = skipAlert ? { context: { skipErrorHandler: true } } : undefined;
    if (force !== undefined) {
      return (await this.api.persons.delete.mutate({ id, force }, opts as any)) !== null;
    }
    return (await this.api.persons.delete.mutate(id, opts as any)) !== null;
  }

  public override async deleteMany(ids: string[], force?: boolean, skipAlert = false): Promise<boolean> {
    const opts = skipAlert ? { context: { skipErrorHandler: true } } : undefined;
    if (force !== undefined) {
      return await this.api.persons.deleteMany.mutate({ ids, force }, opts as any);
    }
    return await this.api.persons.deleteMany.mutate(ids, opts as any);
  }
  public moveEntireHousehold(fromHouseholdId: string, toHouseholdId: string) {
    return this.api.persons.moveEntireHousehold.mutate({ fromHouseholdId, toHouseholdId });
  }

  public detachTag(
    id: string,
    tag_name: string,
    type?: 'tag' | 'issue',
  ): Promise<RouterOutputs['persons']['detachTag']> {
    return this.api.persons.detachTag.mutate({ id, tag_name, type });
  }

  public getAll(options?: getAllOptionsType) {
    return this.getAllWithAddress(options);
  }

  // We don't support archives
  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public async getAllWithAddress(options?: getAllOptionsType) {
    return this.api.persons.getAllWithAddress.query(options, {
      signal: this.ac.signal,
    });
  }

  public getByHouseholdId(id: string, options?: getAllOptionsType) {
    return this.api.persons.getByHouseholdId.query({ id: id, options });
  }

  public getByCompanyId(id: string, options?: getAllOptionsType) {
    return this.api.persons.getByCompanyId.query({ id: id, options });
  }

  public countByCompanyId(id: string): Promise<number> {
    return this.api.persons.countByCompanyId.query({ id });
  }

  public getById(id: string) {
    return this.api.persons.getById.query(id);
  }

  public async getPeopleInHousehold(id: string | null | undefined, options?: getAllOptionsType) {
    if (!id) {
      return [];
    }

    const requiredColumns = ['id', 'first_name', 'middle_names', 'last_name'];
    const mergedColumns = Array.from(new Set([...(options?.columns ?? []), ...requiredColumns]));
    const requestOptions = {
      ...options,
      columns: mergedColumns,
    };

    const peopleInHousehold = (await this.getByHouseholdId(id, requestOptions)) as PERSONINHOUSEHOLDTYPE[];

    return peopleInHousehold.map((person) => {
      return {
        ...person,
        full_name: `${person.first_name || ''} ${person.middle_names || ''} ${person.last_name || ''}`.trim(),
      };
    });
  }

  public getActivity(id: string) {
    return this.api.persons.getActivity.query(id);
  }

  public async getTags(id: string, type?: 'tag' | 'issue') {
    const tags = await this.api.persons.getTags.query({ id, type });
    return tags.map((tag: { name: string }) => tag.name);
  }

  public import(
    rows: RouterInputs['persons']['import']['rows'],
    tags: string[] = [],
    skipped = 0,
    fileName?: string | null,
  ): Promise<RouterOutputs['persons']['import']> {
    // Opt-out of global error toast; importer UI shows a scoped summary instead
    return this.api.persons.import.mutate({ rows, tags, skipped, file_name: fileName ?? undefined }, {
      context: { skipErrorHandler: true },
    } as any);
  }

  public async removeHousehold(id: string) {
    return this.api.persons.removeHousehold.mutate(id);
  }

  public async update(id: string, data: UpdatePersonsType, options?: any) {
    return this.api.persons.update.mutate({ id: id, data }, options);
  }

  public exportCsv(input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return this.api.persons.exportCsv.mutate(input);
  }

  public getPotentialDuplicates(
    options?: RouterInputs['persons']['getPotentialDuplicates'],
  ): Promise<RouterOutputs['persons']['getPotentialDuplicates']> {
    return this.api.persons.getPotentialDuplicates.query(options);
  }

  public getDuplicateCounts(): Promise<RouterOutputs['persons']['getDuplicateCounts']> {
    return this.api.persons.getDuplicateCounts.query();
  }

  public mergePersons(target_id: string, source_id: string): Promise<RouterOutputs['persons']['mergePersons']> {
    return this.api.persons.mergePersons.mutate({ target_id, source_id });
  }
}

export type DATA_TYPE = 'persons' | 'households';
