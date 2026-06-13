import { Service } from '@angular/core';
import {
  ExportCsvInputType,
  ExportCsvResponseType,
  IAuthUserDetail,
  IAuthUserRecord,
  InviteAuthUserType,
  UpdateAuthUserType,
  getAllOptionsType,
} from '@common';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Service()
export class AuthUsersService extends AbstractAPIService<'authusers', UpdateAuthUserType> {
  protected override readonly endpointName = 'authusers';

  public add(row: InviteAuthUserType) {
    return (this.api.authusers.invite.mutate as unknown as (input: any, opts?: any) => Promise<IAuthUserRecord>)(row, {
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

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.api.authusers.getAllWithCounts.query(options, { signal: this.ac.signal }) as Promise<{
      rows: IAuthUserRecord[];
      count: number;
    }>;
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string) {
    return this.api.authusers.getById.query(id) as Promise<IAuthUserDetail>;
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public update(id: string, data: UpdateAuthUserType) {
    return this.api.authusers.update.mutate({ id, data }) as Promise<IAuthUserRecord>;
  }

  public adminTriggerPasswordReset(id: string): Promise<{ success: boolean }> {
    return this.api.authusers.adminTriggerPasswordReset.mutate({ id }) as Promise<{ success: boolean }>;
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('User export is not available'));
  }
}
