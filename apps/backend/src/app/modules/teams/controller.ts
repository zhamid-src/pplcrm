import { AddTeamType, type IAuthKeyPayload, UpdateTeamType, getAllOptionsType } from '@common';

import type { Transaction } from 'kysely';

import { BadRequestError, NotFoundError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { MapPersonsTagRepo } from '../persons/repositories/map-persons-tags.repo';
import { PersonsRepo } from '../persons/repositories/persons.repo';
import { TagsRepo } from '../tags/repositories/tags.repo';
import { MapTeamsPersonsRepo } from './repositories/map-teams-persons.repo';
import { TeamsRepo } from './repositories/teams.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

export class TeamsController extends BaseController<'teams', TeamsRepo> {
  private readonly mapRepo = new MapTeamsPersonsRepo();
  private readonly personsRepo = new PersonsRepo();
  private readonly personsTagRepo = new MapPersonsTagRepo();
  private readonly tagsRepo = new TagsRepo();
  private readonly volunteerTag = 'volunteer';

  constructor() {
    super(new TeamsRepo());
  }

  public async addTeam(auth: IAuthKeyPayload, input: AddTeamType) {
    const repo = this.getRepo();
    return repo.transaction().execute(async (trx) => {
      const volunteerIds = this.normalizeVolunteerIds(input.volunteer_ids, input.team_captain_id);
      await this.ensureVolunteerTag(auth.tenant_id, volunteerIds, auth.user_id, trx);
      const volunteers = await this.fetchVolunteers(auth.tenant_id, volunteerIds, trx);
      if (volunteers.length !== volunteerIds.length) {
        throw new BadRequestError('Volunteers must have the Volunteer tag');
      }

      const captainId = input.team_captain_id ? String(input.team_captain_id) : null;
      if (captainId) {
        const captain = volunteers.find((v) => v.id === captainId);
        if (!captain) throw new BadRequestError('Team captain must have the Volunteer tag');
      }

      const row = {
        tenant_id: auth.tenant_id,
        name: input.name,
        description: input.description ?? null,
        team_captain_id: captainId,
        createdby_id: auth.user_id,
        updatedby_id: auth.user_id,
      } as OperationDataType<'teams', 'insert'>;

      const created = await repo.add({ row }, trx);
      if (!created) throw new NotFoundError('Failed to create team');

      if (volunteerIds.length) {
        await this.mapRepo.replaceVolunteers(
          {
            tenant_id: auth.tenant_id,
            team_id: String((created as any).id),
            person_ids: volunteers.map((person) => person.id),
            user_id: auth.user_id,
          },
          trx,
        );
      }

      const captainName = captainId ? this.resolveCaptainName(created, volunteers) : undefined;

      return {
        ...this.sanitizeTeam(created, captainName ?? undefined),
        volunteers: volunteers.map((person) => ({
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          email: person.email,
        })),
      };
    });
  }

  public async deleteTeam(auth: IAuthKeyPayload, id: string) {
    await this.mapRepo.deleteByTeam({ tenant_id: auth.tenant_id, team_id: id });
    return this.delete(auth.tenant_id as any, id);
  }

  public getAllTeams(tenant: string, options?: getAllOptionsType) {
    return this.getRepo().getAllWithCounts({ tenant_id: tenant, options: options as any });
  }

  public async getTeamsForVolunteer(auth: IAuthKeyPayload, personId: string) {
    const rows = await this.mapRepo.getTeamsForPerson({ tenant_id: auth.tenant_id, person_id: personId });
    return rows
      .filter((row) => row.team_id)
      .map((row) => ({
        id: row.team_id,
        name: row.team_name,
        is_captain: row.is_captain,
      }));
  }

  public async getById(auth: IAuthKeyPayload, id: string) {
    const team = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: id });
    if (!team) throw new NotFoundError('Team not found');

    const volunteerIds = await this.mapRepo.getVolunteerIds({ tenant_id: auth.tenant_id, team_id: id });
    const volunteers = await this.fetchVolunteers(auth.tenant_id, volunteerIds);
    const captainName = this.resolveCaptainName(team, volunteers);
    const sanitized = this.sanitizeTeam(team, captainName ?? undefined);

    const captainStillVolunteer = sanitized.team_captain_id
      ? volunteers.some((v) => v.id === sanitized.team_captain_id)
      : true;

    return {
      ...(captainStillVolunteer
        ? sanitized
        : { ...sanitized, team_captain_id: null, team_captain_name: null }),
      volunteers: volunteers.map((person) => ({
        id: person.id,
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
      })),
    };
  }

  public async updateTeam(auth: IAuthKeyPayload, id: string, input: UpdateTeamType) {
    const existing = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: id });
    if (!existing) throw new NotFoundError('Team not found');

    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row['name'] = input.name;
    if (input.description !== undefined) row['description'] = input.description ?? null;
    if (input.team_captain_id !== undefined) row['team_captain_id'] = input.team_captain_id ?? null;
    row['updated_at'] = new Date();
    row['updatedby_id'] = auth.user_id;

    const repo = this.getRepo();
    return repo.transaction().execute(async (trx) => {
      let result = existing;
      if (Object.keys(row).length > 0) {
        const updatedRow = await repo.update(
          {
            tenant_id: auth.tenant_id,
            id,
            row: row as OperationDataType<'teams', 'update'>,
          },
          trx,
        );
        if (updatedRow) result = updatedRow as typeof existing;
      }

      let volunteerIds = input.volunteer_ids !== undefined
        ? this.normalizeVolunteerIds(input.volunteer_ids)
        : await this.mapRepo.getVolunteerIds({ tenant_id: auth.tenant_id, team_id: id }, trx);

      const currentCaptainId = (result as any)?.team_captain_id != null ? String((result as any).team_captain_id) : null;
      const targetCaptainId = input.team_captain_id !== undefined
        ? (input.team_captain_id ? String(input.team_captain_id) : null)
        : currentCaptainId;

      volunteerIds = this.normalizeVolunteerIds(volunteerIds, targetCaptainId ?? null);

      await this.ensureVolunteerTag(auth.tenant_id, volunteerIds, auth.user_id, trx);
      const volunteers = await this.fetchVolunteers(auth.tenant_id, volunteerIds, trx);
      if (volunteers.length !== volunteerIds.length) {
        throw new BadRequestError('Volunteers must have the Volunteer tag');
      }

      if (targetCaptainId) {
        const captain = volunteers.find((v) => v.id === String(targetCaptainId));
        if (!captain) throw new BadRequestError('Team captain must have the Volunteer tag');
      }

      if (input.volunteer_ids !== undefined || input.team_captain_id !== undefined) {
        await this.mapRepo.replaceVolunteers(
          {
            tenant_id: auth.tenant_id,
            team_id: id,
            person_ids: volunteers.map((person) => person.id),
            user_id: auth.user_id,
          },
          trx,
        );
      }

      const captainName = this.resolveCaptainName(result, volunteers, targetCaptainId);

      return {
        ...this.sanitizeTeam(result, captainName ?? undefined),
        volunteers: volunteers.map((person) => ({
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          email: person.email,
        })),
      };
    });
  }

  private async fetchVolunteers(
    tenant_id: string,
    ids: string[],
    trx?: Transaction<Models>,
  ) {
    if (!ids?.length) return [];
    return this.personsRepo.getByIds({ tenant_id, ids, tags: [this.volunteerTag] }, trx);
  }

  private normalizeVolunteerIds(ids?: Iterable<string | null | undefined>, captainId?: string | null) {
    const set = new Set<string>();
    if (ids) {
      for (const id of ids) {
        if (id) set.add(String(id));
      }
    }
    if (captainId) set.add(String(captainId));
    return Array.from(set);
  }

  private async ensureVolunteerTag(
    tenant_id: string,
    personIds: string[],
    user_id: string,
    trx?: Transaction<Models>,
  ) {
    const ids = Array.from(new Set(personIds.filter(Boolean)));
    if (!ids.length) return;

    const tag = await this.tagsRepo.addOrGet(
      {
        row: {
          tenant_id,
          name: this.volunteerTag,
          description: null,
          deletable: false,
          createdby_id: user_id,
          updatedby_id: user_id,
        } as OperationDataType<'tags', 'insert'>,
        onConflictColumn: 'name',
      },
      trx,
    );

    if (!tag?.id) return;
    const tagId = String(tag.id);

    for (const personId of ids) {
      const existing = await this.personsTagRepo.getId({ tenant_id, person_id: personId, tag_id: tagId }, trx);
      if (existing) continue;
      const row = {
        tenant_id,
        person_id: personId,
        tag_id: tagId,
        createdby_id: user_id,
        updatedby_id: user_id,
      } as OperationDataType<'map_peoples_tags', 'insert'>;
      await this.personsTagRepo.add({ row }, trx);
    }
  }

  private resolveCaptainName(
    record: any,
    volunteers: Array<{ id: string; first_name: string; last_name: string }>,
    fallbackId?: string | null,
  ) {
    const captainId = fallbackId !== undefined
      ? fallbackId
        ? String(fallbackId)
        : null
      : record?.team_captain_id != null
        ? String(record.team_captain_id)
        : null;
    if (!captainId) return null;
    const captain = volunteers.find((v) => v.id === captainId);
    if (!captain) return null;
    const full = `${captain.first_name ?? ''} ${captain.last_name ?? ''}`.trim();
    return full || null;
  }

  private sanitizeTeam(record: any, captainName?: string | null) {
    return {
      id: record.id != null ? String(record.id) : '',
      name: record.name ?? '',
      description: record.description ?? null,
      team_captain_id: record.team_captain_id != null ? String(record.team_captain_id) : null,
      created_at: record.created_at ?? null,
      updated_at: record.updated_at ?? null,
      team_captain_name: captainName ?? null,
    };
  }
}
