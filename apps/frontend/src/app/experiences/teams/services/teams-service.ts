import { Service } from '@angular/core';
import {
  AddTeamType,
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateTeamType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { RouterOutputs } from '../../../services/api/trpc-types';

export type TeamListItem = RouterOutputs['teams']['getAll']['rows'][number];
export type TeamDetail = RouterOutputs['teams']['getById'];
export type TeamAssignmentInfo = RouterOutputs['teams']['getForVolunteer'][number];

@Service()
export class TeamsService extends AbstractAPIService<'teams', UpdateTeamType> {
  protected override readonly endpointName = 'teams';

  public add(row: AddTeamType): Promise<TeamDetail> {
    return this.api.teams.add.mutate(row);
  }

  public addMany(_rows: AddTeamType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.teams.getAll.query({ startRow: 0, endRow: 1 }).then((res: RouterOutputs['teams']['getAll']) => res.count ?? 0);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType): Promise<RouterOutputs['teams']['getAll']> {
    return this.api.teams.getAll.query(options, { signal: this.ac.signal });
  }

  public getTeamsForVolunteer(personId: string): Promise<RouterOutputs['teams']['getForVolunteer']> {
    return this.api.teams.getForVolunteer.query(personId, { signal: this.ac.signal });
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string): Promise<TeamDetail> {
    return this.api.teams.getById.query(id);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public update(id: string, data: UpdateTeamType): Promise<TeamDetail> {
    return this.api.teams.update.mutate({ id, data });
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Team export is not available'));
  }
}
