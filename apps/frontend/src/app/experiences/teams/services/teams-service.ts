import { Service } from '@angular/core';
import {
  AddTeamType,
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateTeamType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

export interface TeamListItem {
  id: string;
  name: string;
  description: string | null;
  team_captain_id: string | null;
  team_captain_name: string | null;
  team_lead_user_id?: string | null;
  team_lead_user_name?: string | null;
  volunteer_count: number;
  updated_at?: Date | string | null;
}

export interface TeamVolunteer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export interface TeamDetail extends Omit<TeamListItem, 'volunteer_count'> {
  volunteers: TeamVolunteer[];
  list_ids?: string[];
  lists?: any[];
}

export interface TeamAssignmentInfo {
  id: string;
  name: string;
  is_captain: boolean;
}

@Service()
export class TeamsService extends AbstractAPIService<'teams', UpdateTeamType> {
  protected override readonly endpointName = 'teams';

  public add(row: AddTeamType) {
    return this.api.teams.add.mutate(row) as Promise<TeamDetail>;
  }

  public addMany(_rows: AddTeamType[]) {
    return Promise.resolve([]);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.api.teams.getAll.query({ startRow: 0, endRow: 1 }).then((res: { count: number }) => res.count ?? 0);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType) {
    return this.api.teams.getAll.query(options, { signal: this.ac.signal }) as Promise<{
      rows: TeamListItem[];
      count: number;
    }>;
  }

  public getTeamsForVolunteer(personId: string) {
    return this.api.teams.getForVolunteer.query(personId, { signal: this.ac.signal }) as Promise<TeamAssignmentInfo[]>;
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string) {
    return this.api.teams.getById.query(id) as Promise<TeamDetail>;
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public update(id: string, data: UpdateTeamType) {
    return this.api.teams.update.mutate({ id, data }) as Promise<TeamDetail>;
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Team export is not available'));
  }
}
