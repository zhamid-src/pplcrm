import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload, UpdatePersonsType, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';

import { BaseController } from '../../lib/base.controller';
import { fingerprintFull, fingerprintStreet } from '../../lib/address-normalize';
import { QueryParams } from '../../lib/base.repo';
import { HouseholdRepo } from '../households/repositories/households.repo';
import { SettingsController } from '../settings/controller';
import { TagsRepo } from '../tags/repositories/tags.repo';
import { MapListsPersonsRepo } from '../lists/repositories/map-lists-persons.repo';
import { MapPersonsTagRepo } from './repositories/map-persons-tags.repo';
import { PersonsRepo } from './repositories/persons.repo';
import { MapTeamsPersonsRepo } from '../teams/repositories/map-teams-persons.repo';
import { TeamsRepo } from '../teams/repositories/teams.repo';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { ImportsRepo } from '../imports/repositories/imports.repo';

/**
 * Controller for managing persons and their associated tags.
 */
export class PersonsController extends BaseController<'persons', PersonsRepo> {
  private mapPersonsTagRepo = new MapPersonsTagRepo();
  private mapListsPersonsRepo = new MapListsPersonsRepo();
  private settingsController = new SettingsController();
  private tagsRepo = new TagsRepo();
  private mapTeamsPersonsRepo = new MapTeamsPersonsRepo();
  private teamsRepo = new TeamsRepo();
  private importsRepo = new ImportsRepo();

  constructor() {
    super(new PersonsRepo());
  }

  /**
   * Add a new person to the database under the authenticated tenant.
   *
   * @param payload - The person data
   * @param auth - Authenticated user's context
   * @returns The newly created person
   */
  public async addPerson(payload: UpdatePersonsType, auth: IAuthKeyPayload) {
    const campaign_id = await this.settingsController.getCurrentCampaignId(auth);
    const households = new HouseholdRepo();

    // Ensure a household_id exists: reuse an existing blank household or create one if missing
    let household_id = payload.household_id as string | undefined;
    if (!household_id) {
      const existingBlank = await households.getBlankHousehold(
        { tenant_id: auth.tenant_id, campaign_id: String(campaign_id) },
      );
      if (existingBlank?.id) {
        household_id = String(existingBlank.id);
      } else {
        const created = await households.add({
          row: {
            tenant_id: auth.tenant_id,
            campaign_id: String(campaign_id),
            createdby_id: auth.user_id,
          } as OperationDataType<'households', 'insert'>,
        });
        household_id = String(created?.id);
      }
    }

    const row = {
      ...payload,
      household_id,
      campaign_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    };

    return this.add(row as OperationDataType<'persons', 'insert'>);
  }

  /**
   * Attach a tag to a person. If the tag does not exist, it will be created.
   *
   * @param person_id - ID of the person
   * @param name - Tag name
   * @param auth - Authenticated user's context
   * @returns The tag-to-person mapping result
   */
  public async attachTag(person_id: string, name: string, auth: IAuthKeyPayload) {
    const row = {
      name,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    };

    const tag = await this.tagsRepo.addOrGet({
      row: row as OperationDataType<'tags', 'insert'>,
      onConflictColumn: 'name',
    });

    return this.addToMap({
      tag_id: tag?.id as string | undefined,
      person_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    });
  }

  /**
   * Detach a tag from a person by tag name.
   *
   * @param input - Object containing tenant_id, person_id, and tag name
   */
  public async detachTag(input: { tenant_id: string; person_id: string; name: string }) {
    const tag = await this.tagsRepo.getIdByName(input);

    if (tag?.id) {
      const id = await this.mapPersonsTagRepo.getId({
        ...input,
        tag_id: tag.id,
      });
      if (id) {
        await this.mapPersonsTagRepo.delete({ tenant_id: input.tenant_id, id });
      }
    }

    const isVolunteerTag = input.name.trim().toLowerCase() === 'volunteer';
    if (!isVolunteerTag) {
      return { removed_team_ids: [], removed_teams: [] };
    }

    const teams = await this.mapTeamsPersonsRepo.getTeamsForPerson({
      tenant_id: input.tenant_id,
      person_id: input.person_id,
    });

    if (!teams.length) {
      return { removed_team_ids: [], removed_teams: [] };
    }

    await this.mapTeamsPersonsRepo.deleteByPerson({ tenant_id: input.tenant_id, person_id: input.person_id });

    for (const team of teams) {
      if (team.is_captain && team.team_id) {
        await this.teamsRepo.clearCaptain({ tenant_id: input.tenant_id, team_id: team.team_id });
      }
    }

    const removedTeams = teams
      .filter((team) => team.team_id)
      .map((team) => ({
        id: team.team_id,
        name: team.team_name ?? '',
        was_captain: team.is_captain,
      }));

    return {
      removed_team_ids: removedTeams.map((team) => team.id),
      removed_teams: removedTeams,
    };
  }

  /**
   * Get all people with their address and any assigned tags.
   *
   * @param auth - Authenticated user's context
   * @param options - Query filters (pagination, sorting, tag filters)
   * @returns A list of persons with address and tags
   */
  public getAllWithAddress(
    auth: IAuthKeyPayload,
    options?: getAllOptionsType,
  ): Promise<{ rows: { [x: string]: unknown }[]; count: number }> {
    const { tags, ...queryParams } = options || {};
    return this.getRepo().getAllWithAddress({
      tenant_id: auth.tenant_id,
      options: queryParams as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
      tags,
    });
  }

  /**
   * Get all persons that belong to a given household.
   *
   * @param household_id - Household ID
   * @param auth - Authenticated user's context
   * @param options - Optional query filters
   * @returns A list of persons in the household
   */
  public getByHouseholdId(household_id: string, auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getByHouseholdId({
      id: household_id,
      tenant_id: auth.tenant_id,
      options: options as QueryParams<'persons'>,
    });
  }

  /**
   * Get all distinct tags assigned to any person in the tenant.
   *
   * @param auth - Authenticated user's context
   * @returns A list of unique tags
   */
  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  /**
   * Get all tags associated with a specific person.
   *
   * @param person_id - Person ID
   * @param auth - Authenticated user's context
   * @returns A list of tags assigned to the person
   */
  public getTags(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags({ id: person_id, tenant_id: auth.tenant_id });
  }

  /**
   * Import multiple rows, creating a household per row (using provided address if any),
   * creating the person, and attaching common tags. Performs basic sanitation.
   */
  public async importRows(
    input: {
      rows: Array<{
        first_name?: string;
        last_name?: string;
        email?: string;
        mobile?: string;
        notes?: string;
        home_phone?: string;
        street_num?: string;
        street1?: string;
        street2?: string;
        apt?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
      }>;
      tags?: string[];
      skipped?: number;
      file_name?: string | null;
    },
    auth: IAuthKeyPayload,
  ) {
    const campaign_id = (await this.settingsController.getCurrentCampaignId(auth)) as string;
    const households = new HouseholdRepo();
    const personsBefore = await this.getRepo().count(auth.tenant_id);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const autoTag = `Imported-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    const tags = [...(input.tags ?? []), autoTag].filter((t) => !!t && t.trim().length > 0);
    const results: { inserted: number; errors: number; households_created: number; skipped: number } = {
      inserted: 0,
      errors: 0,
      households_created: 0,
      skipped: 0,
    };

    const skippedFromClient = Math.max(0, Math.floor(input.skipped ?? 0));
    const totalRows = input.rows.length + skippedFromClient;
    const requestedFileName = (input.file_name ?? '').trim();
    const baseFileName = requestedFileName || `${autoTag}.csv`;

    if (totalRows <= 0) {
      return {
        inserted: 0,
        errors: 0,
        skipped: 0,
        tag: null,
        file_name: requestedFileName || null,
        import_id: null,
        tenant_id: auth.tenant_id,
        campaign_id,
        persons_total_after: personsBefore,
        persons_total_before: personsBefore,
      } as any;
    }

    let importRecordId: string | null = null;
    let autoTagId: string | null = null;

    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        const importRow = {
          tenant_id: auth.tenant_id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
          file_name: baseFileName,
          source: 'persons',
          tag_name: autoTag,
          tag_id: null,
          row_count: totalRows,
          inserted_count: 0,
          error_count: 0,
          skipped_count: skippedFromClient,
          households_created: 0,
          metadata: null,
          processed_at: now,
        } as OperationDataType<'data_imports', 'insert'>;

        const savedImport = await this.importsRepo.add({ row: importRow }, trx);
        importRecordId = savedImport?.id != null ? String(savedImport.id) : null;

        let cachedBlankHouseholdId: string | null = null;

        for (const raw of input.rows) {
          const sanitized = this.sanitizeRow(raw);

          if (
            !sanitized.first_name &&
            !sanitized.last_name &&
            !sanitized.email &&
            !sanitized.mobile &&
            !sanitized.notes
          ) {
            results.skipped += 1;
            continue;
          }

          const isBlankAddress =
            !sanitized.home_phone &&
            !sanitized.street_num &&
            !sanitized.street1 &&
            !sanitized.street2 &&
            !sanitized.apt &&
            !sanitized.city &&
            !sanitized.state &&
            !sanitized.zip &&
            !sanitized.country;

          try {
            const outcome = await trx
              .transaction()
              .execute(async (rowTrx) => {
                let localBlankHouseholdId = cachedBlankHouseholdId;
                let localAutoTagId = autoTagId;
                let householdsCreatedDelta = 0;

                let householdId: string | null = null;
                if (isBlankAddress) {
                  if (!localBlankHouseholdId) {
                    const existingBlank = await households.getBlankHousehold(
                      { tenant_id: auth.tenant_id, campaign_id },
                      rowTrx,
                    );
                    if (existingBlank?.id) {
                      localBlankHouseholdId = String(existingBlank.id);
                    } else {
                      const created = await households.add(
                        {
                          row: {
                            tenant_id: auth.tenant_id,
                            campaign_id,
                            createdby_id: auth.user_id,
                            updatedby_id: auth.user_id,
                            file_id: importRecordId,
                          } as OperationDataType<'households', 'insert'>,
                        },
                        rowTrx,
                      );
                      localBlankHouseholdId = String(created?.id);
                      householdsCreatedDelta += 1;
                    }
                  }
                  householdId = localBlankHouseholdId;
                } else {
                  const fp_street = fingerprintStreet({
                    street_num: sanitized.street_num,
                    street1: sanitized.street1,
                    street2: sanitized.street2,
                  });
                  const fp_full = fingerprintFull({
                    apt: sanitized.apt,
                    street_num: sanitized.street_num,
                    street1: sanitized.street1,
                    street2: sanitized.street2,
                    city: sanitized.city,
                    state: sanitized.state,
                    zip: sanitized.zip,
                    country: sanitized.country,
                  });

                  const match = await households.findByFingerprint(
                    { tenant_id: auth.tenant_id, campaign_id, fp_street: fp_street, fp_full: fp_full },
                    rowTrx,
                  );
                  if (match?.id) {
                    householdId = String(match.id);
                  } else {
                    const hhRow = {
                      tenant_id: auth.tenant_id,
                      campaign_id,
                      createdby_id: auth.user_id,
                      updatedby_id: auth.user_id,
                      home_phone: sanitized.home_phone ?? null,
                      street_num: sanitized.street_num ?? null,
                      street1: sanitized.street1 ?? null,
                      street2: sanitized.street2 ?? null,
                      apt: sanitized.apt ?? null,
                      city: sanitized.city ?? null,
                      state: sanitized.state ?? null,
                      zip: sanitized.zip ?? null,
                      country: sanitized.country ?? null,
                      address_fp_street: fp_street,
                      address_fp_full: fp_full,
                      notes: null,
                      json: null,
                      file_id: importRecordId,
                    } as OperationDataType<'households', 'insert'>;

                    const household = await households.add({ row: hhRow }, rowTrx);
                    householdId = String(household?.id);
                    householdsCreatedDelta += 1;
                  }
                }

                if (!householdId) {
                  throw new Error('Failed to resolve household for imported person');
                }

                const personRow = {
                  tenant_id: auth.tenant_id,
                  campaign_id,
                  createdby_id: auth.user_id,
                  updatedby_id: auth.user_id,
                  household_id: householdId,
                  first_name: sanitized.first_name ?? null,
                  middle_names: null,
                  last_name: sanitized.last_name ?? null,
                  email: sanitized.email ?? null,
                  email2: null,
                  mobile: sanitized.mobile ?? null,
                  home_phone: null,
                  file_id: importRecordId,
                  notes: sanitized.notes ?? null,
                  json: null,
                } as OperationDataType<'persons', 'insert'>;

                const person = await this.add(personRow, rowTrx);

                for (const name of tags) {
                  const row = {
                    name,
                    tenant_id: auth.tenant_id,
                    createdby_id: auth.user_id,
                    updatedby_id: auth.user_id,
                  } as OperationDataType<'tags', 'insert'>;

                  const tag = await this.tagsRepo.addOrGet({ row, onConflictColumn: 'name' }, rowTrx);
                  if (name === autoTag && tag?.id != null && !localAutoTagId) {
                    localAutoTagId = String(tag.id);
                  }
                  if (!tag?.id) {
                    throw new Error('Failed to create tag for imported person');
                  }

                  await this.mapPersonsTagRepo.add(
                    {
                      row: {
                        tenant_id: auth.tenant_id,
                        person_id: person?.id as string,
                        tag_id: tag.id as unknown as string,
                        createdby_id: auth.user_id,
                        updatedby_id: auth.user_id,
                      } as OperationDataType<'map_peoples_tags', 'insert'>,
                    },
                    rowTrx,
                  );
                }

                return {
                  householdsCreatedDelta,
                  blankHouseholdId: localBlankHouseholdId,
                  autoTagId: localAutoTagId,
                };
              });

            results.inserted += 1;
            results.households_created += outcome.householdsCreatedDelta;
            if (outcome.blankHouseholdId) {
              cachedBlankHouseholdId = outcome.blankHouseholdId;
            }
            if (!autoTagId && outcome.autoTagId) {
              autoTagId = outcome.autoTagId;
            }
          } catch {
            results.errors += 1;
          }
        }

        if (importRecordId) {
          await this.importsRepo.update(
            {
              tenant_id: auth.tenant_id as any,
              id: importRecordId as any,
              row: {
                tag_id: autoTagId,
                inserted_count: results.inserted,
                error_count: results.errors,
                skipped_count: skippedFromClient + results.skipped,
                households_created: results.households_created,
                updatedby_id: auth.user_id,
                processed_at: now,
                updated_at: now,
              } as OperationDataType<'data_imports', 'update'>,
            },
            trx,
          );
        }
      });

    const personsAfter = await this.getRepo().count(auth.tenant_id);
    const totalSkipped = skippedFromClient + results.skipped;

    await this.userActivity.log({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      activity: 'import',
      entity: 'persons',
      quantity: results.inserted,
      metadata: {
        rows_received: input.rows.length,
        tags_applied: tags.slice(0, 10),
        auto_tag: autoTag,
        households_created: results.households_created,
        errors: results.errors,
        skipped: totalSkipped,
        file_name: baseFileName,
        import_id: importRecordId,
      },
    });

    return {
      ...results,
      skipped: totalSkipped,
      tag: autoTag,
      file_name: baseFileName,
      import_id: importRecordId,
      tenant_id: auth.tenant_id,
      campaign_id,
      persons_total_after: personsAfter,
      persons_total_before: personsBefore,
    } as any;
  }

  /**
   * Move a person to a new blank household to clear address while
   * preserving non-null household_id constraint.
   */
  public async removeHousehold(person_id: string, auth: IAuthKeyPayload) {
    const campaign_id = (await this.settingsController.getCurrentCampaignId(auth)) as string;
    return this.getRepo().moveToNewHousehold({
      tenant_id: auth.tenant_id,
      person_id,
      user_id: auth.user_id,
      campaign_id,
    });
  }

  /**
   * Link a tag ID to a person ID in the mapping table.
   *
   * @param row - Mapping data
   * @returns The result of the insert operation
   * @throws TRPCError if tag_id is missing
   */
  private async addToMap(row: {
    tag_id: string | undefined;
    person_id: string;
    tenant_id: string;
    createdby_id: string;
    updatedby_id: string;
  }) {
    if (!row.tag_id) {
      throw new TRPCError({
        message: 'Failed to add the tag',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    return await this.mapPersonsTagRepo.add({
      row: row as OperationDataType<'map_peoples_tags', 'insert'>,
    });
  }

  /** Override deleteMany to clear dependent mappings before deleting persons */
  public override async deleteMany(tenant_id: string, idsToDelete: string[]): Promise<boolean> {
    if (!idsToDelete?.length) return false;
    return await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        // Delete tag mappings
        await this.mapPersonsTagRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete list mappings
        await this.mapListsPersonsRepo.deleteByPersonIds({ tenant_id, person_ids: idsToDelete }, trx);
        // Delete persons within the same transaction
        return this.getRepo().deleteMany({ tenant_id: tenant_id as any, ids: idsToDelete as any }, trx);
      });
  }

  /** Override delete to reuse deleteMany path */
  public override async delete(tenant_id: string, idToDelete: string): Promise<boolean> {
    return this.deleteMany(tenant_id, [idToDelete]);
  }

  private sanitizePhone(v?: string) {
    if (!v) return undefined;
    const digits = v.replace(/[^0-9+]/g, '');
    // If starts with + keep it, else digits only
    if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/[^0-9]/g, '');
    return digits.replace(/[^0-9]/g, '');
  }

  private sanitizeRow(row: {
    first_name?: string;
    last_name?: string;
    email?: string;
    mobile?: string;
    notes?: string;
    home_phone?: string;
    street_num?: string;
    street1?: string;
    street2?: string;
    apt?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }) {
    const trim = (v?: string) => (v ? v.trim() : undefined);

    // Extract email/phone even if jammed into other fields
    let first_name = trim(row.first_name);
    const last_name = trim(row.last_name);
    let email = (trim(row.email) || '').toLowerCase();
    let mobile = this.sanitizePhone(row.mobile);
    const home_phone = this.sanitizePhone(row.home_phone);
    const notes = trim(row.notes);

    // If email was not provided in its field, try to find it in name fields
    if (!email) {
      email = (this.findEmail(first_name || '') || this.findEmail(last_name || '') || '').toLowerCase();
    }
    if (email && !/.+@.+\..+/.test(email)) email = '';

    // Try to discover a phone in the name fields if mobile not provided
    if (!mobile) {
      const possiblePhone = this.findPhone(first_name) || this.findPhone(last_name);
      mobile = this.sanitizePhone(possiblePhone);
    }

    // Clean noisy tokens from first_name (emails/phones/commas)
    if (first_name) first_name = this.stripNoise(first_name);
    if (!first_name && email) first_name = this.nameFromEmail(email);

    return {
      first_name,
      last_name,
      email: email || undefined,
      mobile,
      notes,
      home_phone,
      street_num: trim(row.street_num),
      street1: trim(row.street1),
      street2: trim(row.street2),
      apt: trim(row.apt),
      city: trim(row.city),
      state: trim(row.state),
      zip: trim(row.zip),
      country: trim(row.country),
    };
  }

  private findEmail(text: string): string | undefined {
    const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m?.[0];
  }

  private findPhone(text?: string): string | undefined {
    if (!text) return undefined;
    const m = text.match(/\+?\d[\d\s-]{7,}\d/);
    return m?.[0];
  }

  private stripNoise(text: string): string | undefined {
    const noEmail = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ');
    const noPhone = noEmail.replace(/\+?\d[\d\s-]{7,}\d/g, ' ');
    const cleaned = noPhone.replace(/[,]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return cleaned || undefined;
  }

  private nameFromEmail(email: string): string | undefined {
    const local = (email || '').split('@')[0] || '';
    const token = local.split(/[._+-]/)[0] || '';
    if (!token) return undefined;
    return token.charAt(0).toUpperCase() + token.slice(1);
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getAllWithAddress(auth, input?.options);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input);
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: 'persons',
        quantity: response.rowCount,
        metadata: {
          requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
          returned_columns: response.columns.slice(0, 12),
          file_name: response.fileName,
        },
      });
      return response;
    }
    return super.exportCsv(input, auth);
  }
}
