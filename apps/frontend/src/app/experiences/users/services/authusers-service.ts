import { Injectable } from '@angular/core';
import {
  ExportCsvInputType,
  ExportCsvResponseType,
  InviteAuthUserType,
  UpdateAuthUserType,
  getAllOptionsType,
} from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Injectable({ providedIn: 'root' })
export class AuthUsersService extends AbstractAPIService<'authusers', UpdateAuthUserType> {
  public add(row: InviteAuthUserType) {
    return (this.api.authusers.invite.mutate as unknown as (input: any, opts?: any) => Promise<any>)(row, {
      meta: { skipErrorHandler: true },
    });
  }

  public addMany(_rows: InviteAuthUserType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.authusers.count.query();
  }

  public delete(_id: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  public deleteMany(_ids: string[]): Promise<boolean> {
    return Promise.resolve(false);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.api.authusers.getAllWithCounts.query(options, { signal: this.ac.signal });
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string) {
    return this.api.authusers.getById.query(id);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public update(id: string, data: UpdateAuthUserType) {
    return this.api.authusers.update.mutate({ id, data });
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('User export is not available'));
  }
}
