import { env } from '../../../../env';
import type { IAuthKeyPayload, UpdatePersonsType } from '../../../../../../../libs/common/src';
import { TRPCError } from '@trpc/server';

import { fingerprintFull, fingerprintStreet } from '../../../lib/address-normalize';
import { HouseholdRepo } from '../../households/repositories/households.repo';
import { SettingsController } from '../../settings/controller';
import { TagsRepo } from '../../tags/repositories/tags.repo';
import { MapPersonsTagRepo } from '../repositories/map-persons-tags.repo';
import { PersonsRepo } from '../repositories/persons.repo';
import { CompaniesRepo } from '../../companies/repositories/companies.repo';
import { MapTeamsPersonsRepo } from '../../teams/repositories/map-teams-persons.repo';
import { TeamsRepo } from '../../teams/repositories/teams.repo';
import type { OperationDataType } from '../../../../../../../libs/common/src/lib/kysely.models';
import { ImportsRepo } from '../../imports/repositories/imports.repo';
import { UserActivityRepo } from '../../../lib/user-activity.repo';
import { StorageService } from '../../../lib/storage.service';
import { WorkflowsController } from '../../workflows/controller';
import { TransactionalEmailService } from '../../../lib/mail/transactional-mail.service';
import { queueZapierTrigger, pickPersonFields } from '../../zapier/zapier.service';
import { logger } from '../../../logger';

export class PersonsService {
  private mapPersonsTagRepo = new MapPersonsTagRepo();
  private settingsController = new SettingsController();
  private tagsRepo = new TagsRepo();
  private mapTeamsPersonsRepo = new MapTeamsPersonsRepo();
  private teamsRepo = new TeamsRepo();
  private importsRepo = new ImportsRepo();
  private personsRepo = new PersonsRepo();
  private userActivity = new UserActivityRepo();
  private storageService = new StorageService();
  private householdRepo = new HouseholdRepo();
  private companiesRepo = new CompaniesRepo();

  public async addPerson(payload: UpdatePersonsType, auth: IAuthKeyPayload) {
    // Enforce email uniqueness within the tenant
    const emailToCheck = payload.email?.trim();
    if (emailToCheck) {
      const existing = await this.personsRepo.findByEmail({ tenant_id: auth.tenant_id, email: emailToCheck });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A person with the email "${emailToCheck}" already exists.`,
        });
      }
    }

    const campaign_id = await this.settingsController.getCurrentCampaignId(auth);
    const households = new HouseholdRepo();

    let household_id = payload.household_id as string | undefined;
    if (!household_id) {
      const existingBlank = await households.getBlankHousehold({
        tenant_id: auth.tenant_id,
        campaign_id: String(campaign_id),
      });
      if (existingBlank?.id) {
        household_id = String(existingBlank.id);
      } else {
        const created = await households.add({
          row: {
            tenant_id: auth.tenant_id,
            campaign_id: String(campaign_id),
            createdby_id: auth.user_id,
            updatedby_id: auth.user_id,
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
      updatedby_id: auth.user_id,
    };

    const result = await this.personsRepo.add({ row: row as OperationDataType<'persons', 'insert'> });
    if (result && typeof result === 'object') {
      try {
        const { queueUsageLimitCheck } = await import('../../billing/usage-limits');
        await queueUsageLimitCheck(auth.tenant_id, this.personsRepo.db);
      } catch (err) {
        logger.error({ err }, 'Failed to trigger usage check in addPerson');
      }
      try {
        const workflowsController = new WorkflowsController();
        await workflowsController.triggerWorkflow(
          auth.tenant_id,
          String((result as Record<string, unknown>)['id']),
          'contact_created',
          null,
        );
      } catch (err) {
        logger.error({ err }, 'Failed to trigger contact_created workflow in add');
      }

      if (payload.assigned_to) {
        try {
          const assignee = await this.personsRepo.db
            .selectFrom('authusers')
            .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
            .select(['authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
            .where('authusers.id', '=', String(payload.assigned_to))
            .executeTakeFirst();
          if (assignee && assignee.email) {
            let optedIn = true;
            if (assignee.profile_json) {
              const json =
                typeof assignee.profile_json === 'string' ? JSON.parse(assignee.profile_json) : assignee.profile_json;
              if (json?.notifications?.person_assigned === false) {
                optedIn = false;
              }
            }
            if (optedIn) {
              const createdPerson = result as Record<string, unknown>;
              const personName =
                `${createdPerson['first_name'] || ''} ${createdPerson['last_name'] || ''}`.trim() || 'unnamed contact';
              const link = `${env.appUrl}/persons/${createdPerson['id']}`;
              const mailService = new TransactionalEmailService();
              await mailService.sendMail({
                to: assignee.email,
                subject: `Contact Assigned to You: ${personName}`,
                text: `Hi ${assignee.first_name},\n\nYou have been assigned ownership of the contact: ${personName} by ${auth.name}.\n\nContact Details:\nEmail: ${createdPerson['email'] || 'None'}\nPhone: ${createdPerson['mobile'] || createdPerson['home_phone'] || 'None'}\n\nView details: ${link}`,
                html: `<p>Hi ${assignee.first_name},</p><p>You have been assigned ownership of the contact: <strong>${personName}</strong> by ${auth.name}.</p><p><strong>Contact Details:</strong><br>Email: ${createdPerson['email'] || 'None'}<br>Phone: ${createdPerson['mobile'] || createdPerson['home_phone'] || 'None'}</p><p><a href="${link}">View Contact Card</a></p>`,
              });
            }
          }
        } catch (mailErr) {
          logger.error({ err: mailErr }, 'Failed to send contact assignment email in addPerson');
        }
      }
    }
    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'create',
        entity: 'persons',
        entity_id: result?.id ? String(result.id) : null,
        quantity: 1,
        metadata: {
          id: result?.id,
          entity_label: `${result?.first_name || ''} ${result?.last_name || ''}`.trim() || 'Person',
          ...(auth.source ? { source: auth.source } : {}),
        },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to log create person activity');
    }
    try {
      await queueZapierTrigger(
        this.personsRepo.db,
        auth.tenant_id,
        'person_created',
        pickPersonFields(result as Record<string, unknown>),
      );
    } catch (e) {
      logger.error({ err: e }, '[Zapier] Failed to queue person_created trigger');
    }
    return result;
  }

  public async updatePerson(id: string, data: UpdatePersonsType, auth: IAuthKeyPayload) {
    // Enforce email uniqueness within the tenant (excluding the person being updated)
    const emailToCheck = data.email?.trim();
    if (emailToCheck) {
      const existing = await this.personsRepo.findByEmail({ tenant_id: auth.tenant_id, email: emailToCheck });
      if (existing && String(existing.id) !== String(id)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A person with the email "${emailToCheck}" already exists.`,
        });
      }
    }

    let original: Record<string, unknown> | null = null;
    try {
      original = ((await this.personsRepo.getOneBy('id', { value: id, tenant_id: auth.tenant_id })) ?? null) as Record<
        string,
        unknown
      > | null;
    } catch (err) {
      logger.error({ err }, 'Failed to fetch original person record for activity log');
    }
    const result = await this.personsRepo.update({
      tenant_id: auth.tenant_id,
      id,
      row: {
        ...data,
        updatedby_id: auth.user_id,
      } as OperationDataType<'persons', 'update'>,
    });
    if (result && typeof result === 'object') {
      const updatedPerson = result as Record<string, unknown>;
      if (data.assigned_to !== undefined && original && String(data.assigned_to) !== String(original['assigned_to'])) {
        const newAssigneeId = data.assigned_to;
        if (newAssigneeId) {
          try {
            const assignee = await this.personsRepo.db
              .selectFrom('authusers')
              .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
              .select(['authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
              // String conversion ensures precision is maintained down to the database driver level
              .where('authusers.id', '=', String(newAssigneeId))
              .executeTakeFirst();

            if (assignee && assignee.email) {
              let optedIn = true;
              if (assignee.profile_json) {
                const json =
                  typeof assignee.profile_json === 'string' ? JSON.parse(assignee.profile_json) : assignee.profile_json;
                if (json?.notifications?.person_assigned === false) {
                  optedIn = false;
                }
              }
              if (optedIn) {
                const personName =
                  `${updatedPerson['first_name'] || ''} ${updatedPerson['last_name'] || ''}`.trim() ||
                  'unnamed contact';
                const link = `${env.appUrl}/persons/${updatedPerson['id']}`;
                const mailService = new TransactionalEmailService();
                await mailService.sendMail({
                  to: assignee.email,
                  subject: `Contact Assigned to You: ${personName}`,
                  text: `Hi ${assignee.first_name},\n\nYou have been assigned ownership of the contact: ${personName} by ${auth.name}.\n\nContact Details:\nEmail: ${updatedPerson['email'] || 'None'}\nPhone: ${updatedPerson['mobile'] || updatedPerson['home_phone'] || 'None'}\n\nView details: ${link}`,
                  html: `<p>Hi ${assignee.first_name},</p><p>You have been assigned ownership of the contact: <strong>${personName}</strong> by ${auth.name}.</p><p><strong>Contact Details:</strong><br>Email: ${updatedPerson['email'] || 'None'}<br>Phone: ${updatedPerson['mobile'] || updatedPerson['home_phone'] || 'None'}</p><p><a href="${link}">View Contact Card</a></p>`,
                });
              }
            }
          } catch (mailErr) {
            logger.error({ err: mailErr }, 'Failed to send contact assignment email in updatePerson');
          }
        }
      }
    }
    try {
      const changes: Record<string, unknown> = {};
      const resultObj = result && typeof result === 'object' ? (result as Record<string, unknown>) : null;
      if (original && resultObj) {
        const skipKeys = ['id', 'tenant_id', 'createdby_id', 'updatedby_id', 'created_at', 'updated_at'];
        for (const key of Object.keys(data)) {
          if (skipKeys.includes(key)) continue;
          const oldVal = (original as Record<string, unknown>)[key];
          const newVal = resultObj[key];
          if (oldVal !== newVal) {
            changes[key] = { from: oldVal ?? null, to: newVal ?? null };
          }
        }
      }
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'update',
        entity: 'persons',
        entity_id: id ? String(id) : null,
        quantity: 1,
        metadata: {
          id,
          entity_label: resultObj
            ? `${resultObj['first_name'] || ''} ${resultObj['last_name'] || ''}`.trim() || 'Person'
            : 'Person',
          changes,
          ...(auth.source ? { source: auth.source } : {}),
        },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to log update person activity');
    }
    try {
      await queueZapierTrigger(
        this.personsRepo.db,
        auth.tenant_id,
        'person_updated',
        pickPersonFields(result as Record<string, unknown>),
      );
    } catch (e) {
      logger.error({ err: e }, '[Zapier] Failed to queue person_updated trigger');
    }
    return result;
  }

  private stripHtmlAndTruncate(html: string | null | undefined, limit = 160): string {
    if (!html) return '';
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
  }

  public async getPersonActivity(person_id: string, auth: IAuthKeyPayload) {
    const person = (await this.personsRepo.getOneBy('id', { value: person_id, tenant_id: auth.tenant_id })) as Record<
      string,
      unknown
    > | null;
    if (!person) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Person not found',
      });
    }

    const emails: string[] = [];
    if (person['email']) emails.push((person['email'] as string).trim().toLowerCase());
    if (person['email2']) emails.push((person['email2'] as string).trim().toLowerCase());

    if (emails.length === 0) {
      return {
        emails: [],
        newsletters: [],
      };
    }

    const db = this.personsRepo.db;

    // 1. Fetch email conversations (sent and received)
    const conversations = await db
      .selectFrom('emails')
      .leftJoin('email_bodies', 'email_bodies.email_id', 'emails.id')
      .selectAll('emails')
      .select('email_bodies.body_html as body_html')
      .where('emails.tenant_id', '=', auth.tenant_id)
      .where((eb) => eb.or([eb('emails.from_email', 'in', emails), eb('emails.to_email', 'in', emails)]))
      .orderBy('emails.created_at', 'desc')
      .limit(50)
      .execute();

    // 2. Fetch newsletter events (received, opened, clicked links, etc.)
    const newsletterEvents = await db
      .selectFrom('newsletter_events')
      .innerJoin('newsletters', 'newsletters.id', 'newsletter_events.newsletter_id')
      .select([
        'newsletter_events.id',
        'newsletter_events.event_type',
        'newsletter_events.timestamp',
        'newsletter_events.url',
        'newsletters.subject as newsletter_subject',
        'newsletters.name as newsletter_name',
      ])
      .where('newsletter_events.tenant_id', '=', auth.tenant_id)
      .where('newsletter_events.email', 'in', emails)
      .orderBy('newsletter_events.timestamp', 'desc')
      .limit(100)
      .execute();

    return {
      emails: conversations.map((mail) => {
        let snippet = '';
        if (mail.body_html) {
          snippet = this.stripHtmlAndTruncate(mail.body_html, 160);
        }
        if (!snippet && mail.preview && !/^(ms|google):/i.test(mail.preview)) {
          snippet = mail.preview;
        }
        return {
          ...mail,
          preview: snippet,
        };
      }),
      newsletters: newsletterEvents,
    };
  }

  public async attachTag(person_id: string, name: string, type: 'tag' | 'issue' = 'tag', auth: IAuthKeyPayload) {
    const randomHexColor = () =>
      '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0');
    const row = {
      name,
      color: randomHexColor(),
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      type,
    };

    const tag = await this.tagsRepo.addOrGet({
      row: row as OperationDataType<'tags', 'insert'>,
      onConflictColumn: 'name',
    });

    const result = await this.addToMap({
      tag_id: tag?.id as string | undefined,
      person_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    });

    if (result && tag?.id) {
      try {
        const workflowsController = new WorkflowsController();
        await workflowsController.triggerTagAdded(auth.tenant_id, person_id, String(tag.id), name);
      } catch (err) {
        logger.error({ err }, 'Failed to trigger tag_added workflow');
      }
    }

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'update',
        entity: 'persons',
        entity_id: person_id,
        quantity: 1,
        metadata: { id: person_id, action: `attach_${type}`, name, ...(auth.source ? { source: auth.source } : {}) },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to log attach tag activity');
    }
    try {
      await queueZapierTrigger(this.personsRepo.db, auth.tenant_id, 'person_tag_added', {
        person_id,
        tag_name: name,
        tag_type: type,
      });
    } catch (e) {
      logger.error({ err: e }, '[Zapier] Failed to queue person_tag_added trigger');
    }

    return result;
  }

  public async detachTag(input: {
    tenant_id: string;
    person_id: string;
    name: string;
    type?: 'tag' | 'issue';
    user_id?: string;
    source?: string;
  }) {
    const tag = await this.tagsRepo.getIdByName({
      tenant_id: input.tenant_id,
      name: input.name,
      type: input.type ?? 'tag',
    });

    if (tag?.id) {
      await this.mapPersonsTagRepo.deleteMapping({
        tenant_id: input.tenant_id,
        person_id: input.person_id,
        tag_id: tag.id,
      });
    }

    try {
      if (input.user_id) {
        await this.userActivity.log({
          tenant_id: input.tenant_id,
          user_id: input.user_id,
          activity: 'update',
          entity: 'persons',
          entity_id: input.person_id,
          quantity: 1,
          metadata: {
            id: input.person_id,
            action: `detach_${input.type ?? 'tag'}`,
            name: input.name,
            ...(input.source ? { source: input.source } : {}),
          },
        });
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to log detach tag activity');
    }
    try {
      await queueZapierTrigger(this.personsRepo.db, input.tenant_id, 'person_tag_removed', {
        person_id: input.person_id,
        tag_name: input.name,
        tag_type: input.type ?? 'tag',
      });
    } catch (e) {
      logger.error({ err: e }, '[Zapier] Failed to queue person_tag_removed trigger');
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
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const autoTag = `Imported-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    const tags = [...(input.tags ?? []), autoTag].filter((t) => !!t && t.trim().length > 0);
    const skippedFromClient = Math.max(0, Math.floor(input.skipped ?? 0));
    const requestedFileName = (input.file_name ?? '').trim();
    const baseFileName = requestedFileName || `${autoTag}.csv`;
    const totalRows = input.rows.length + skippedFromClient;

    let hasImportableRow = false;
    for (const candidate of input.rows) {
      const sanitized = this.sanitizeRow(candidate);
      if (sanitized.first_name || sanitized.last_name || sanitized.email || sanitized.mobile || sanitized.notes) {
        hasImportableRow = true;
        break;
      }
    }

    if (!hasImportableRow) {
      const totalSkipped = skippedFromClient + input.rows.length;
      const personsBefore = await this.personsRepo.count(auth.tenant_id);
      return {
        inserted: 0,
        errors: 0,
        skipped: totalSkipped,
        tag: null,
        file_name: requestedFileName || null,
        import_id: null,
        tenant_id: auth.tenant_id,
        campaign_id,
        persons_total_after: personsBefore,
        persons_total_before: personsBefore,
        status: 'completed',
      };
    }

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
      status: 'pending',
      metadata: null,
      processed_at: now,
    } as any;

    const savedImport = await this.importsRepo.add({ row: importRow });
    if (!savedImport || !savedImport.id) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create data import record',
      });
    }

    const importRecordId = String(savedImport.id);
    const storageKey = `imports/payloads/${auth.tenant_id}/${importRecordId}.json`;

    try {
      const payloadBuffer = Buffer.from(JSON.stringify(input.rows), 'utf8');
      await this.storageService.upload(storageKey, payloadBuffer, 'application/json');
    } catch (err) {
      logger.error({ err }, 'Failed to upload import payload to storage');
      await this.importsRepo.delete({ tenant_id: auth.tenant_id, id: importRecordId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to store import payload on server storage',
      });
    }

    await this.importsRepo.update({
      tenant_id: auth.tenant_id,
      id: importRecordId,
      row: {
        metadata: JSON.stringify({ storage_key: storageKey }),
      } as any,
    });

    await this.importsRepo.db
      .insertInto('background_jobs')
      .values({
        tenant_id: auth.tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          import_id: importRecordId,
          storage_key: storageKey,
          tags,
          skipped: skippedFromClient,
          campaign_id,
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          file_name: baseFileName,
        }),
        run_at: new Date(),
      })
      .execute();

    return {
      inserted: 0,
      errors: 0,
      skipped: skippedFromClient,
      tag: autoTag,
      file_name: baseFileName,
      import_id: importRecordId,
      tenant_id: auth.tenant_id,
      campaign_id,
      status: 'pending',
    };
  }

  public async processImportRows(
    import_id: string,
    tenant_id: string,
    user_id: string,
    campaign_id: string,
    tags: string[],
    skipped: number,
    rows: Record<string, string>[],
  ) {
    const households = new HouseholdRepo();
    const results: { inserted: number; errors: number; households_created: number; skipped: number } = {
      inserted: 0,
      errors: 0,
      households_created: 0,
      skipped: 0,
    };
    const importedPersonIds: string[] = [];

    const errorMessages: string[] = [];
    let cachedBlankHouseholdId: string | null = null;
    let autoTagId: string | null = null;
    const autoTag = tags.find((t) => t.startsWith('Imported-')) || tags[0];

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      // 1. Sanitize and classify all valid rows in the chunk upfront
      type ValidEntry = {
        sanitized: {
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
        };
        isBlankAddress: boolean;
        fp_street: string | null;
        fp_full: string | null;
      };
      const validEntries: ValidEntry[] = [];
      for (const raw of chunk) {
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
        validEntries.push({
          sanitized,
          isBlankAddress,
          fp_street: isBlankAddress
            ? null
            : fingerprintStreet({
                street_num: sanitized.street_num,
                street1: sanitized.street1,
                street2: sanitized.street2,
              }),
          fp_full: isBlankAddress
            ? null
            : fingerprintFull({
                apt: sanitized.apt,
                street_num: sanitized.street_num,
                street1: sanitized.street1,
                street2: sanitized.street2,
                city: sanitized.city,
                state: sanitized.state,
                zip: sanitized.zip,
                country: sanitized.country,
              }),
        });
      }

      if (validEntries.length === 0) {
        await this.importsRepo.update({
          tenant_id: tenant_id,
          id: import_id,
          row: {
            tag_id: autoTagId,
            inserted_count: results.inserted,
            error_count: results.errors,
            skipped_count: skipped + results.skipped,
            households_created: results.households_created,
            updatedby_id: user_id,
            updated_at: new Date(),
          } as any,
        });
        continue;
      }

      try {
        const outcome = await this.personsRepo.transaction().execute(async (trx) => {
          let localBlankHouseholdId = cachedBlankHouseholdId;
          let localAutoTagId = autoTagId;
          let householdsCreatedDelta = 0;

          // 2a. Resolve blank household once for the whole chunk
          if (validEntries.some((e) => e.isBlankAddress)) {
            if (!localBlankHouseholdId) {
              const existingBlank = await households.getBlankHousehold({ tenant_id, campaign_id }, trx);
              if (existingBlank?.id) {
                localBlankHouseholdId = String(existingBlank.id);
              } else {
                const created = await households.add(
                  {
                    row: {
                      tenant_id,
                      campaign_id,
                      createdby_id: user_id,
                      updatedby_id: user_id,
                      file_id: import_id,
                    } as OperationDataType<'households', 'insert'>,
                  },
                  trx,
                );
                localBlankHouseholdId = String(created?.id);
                householdsCreatedDelta += 1;
              }
            }
          }

          // 2b. Batch-resolve addressed households with a single IN query
          const fpCache = new Map<string, string>(); // fp_full -> household_id
          const uniqueFps = [
            ...new Set(validEntries.filter((e) => !e.isBlankAddress && e.fp_full).map((e) => e.fp_full as string)),
          ];
          if (uniqueFps.length > 0) {
            const existingHouseholds = await trx
              .selectFrom('households')
              .select(['id', 'address_fp_full'])
              .where('tenant_id', '=', tenant_id)
              .where('campaign_id', '=', campaign_id)
              .where('address_fp_full', 'in', uniqueFps)
              .execute();
            for (const h of existingHouseholds) {
              if (h.address_fp_full) fpCache.set(h.address_fp_full, String(h.id));
            }
          }

          // 2c. Create only missing households (deduplicated within this chunk)
          for (const entry of validEntries) {
            if (entry.isBlankAddress || !entry.fp_full) continue;
            if (fpCache.has(entry.fp_full)) continue;
            const { sanitized, fp_street, fp_full } = entry;
            const hhRow = {
              tenant_id,
              campaign_id,
              createdby_id: user_id,
              updatedby_id: user_id,
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
              file_id: import_id,
            } as OperationDataType<'households', 'insert'>;
            const household = await households.add({ row: hhRow }, trx);
            fpCache.set(fp_full, String(household?.id));
            householdsCreatedDelta += 1;
          }

          // 3. Batch insert all persons in one statement
          const personRows = validEntries.map(({ sanitized, isBlankAddress, fp_full }) => ({
            tenant_id,
            campaign_id,
            createdby_id: user_id,
            updatedby_id: user_id,
            household_id: isBlankAddress ? (localBlankHouseholdId ?? '') : (fpCache.get(fp_full ?? '') ?? ''),
            first_name: sanitized.first_name ?? null,
            middle_names: null,
            last_name: sanitized.last_name ?? null,
            email: sanitized.email ?? null,
            email2: null,
            mobile: sanitized.mobile ?? null,
            home_phone: null,
            file_id: import_id,
            notes: sanitized.notes ?? null,
            json: null,
          }));
          const insertedPersons = await trx
            .insertInto('persons')
            .values(personRows)
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .execute();

          // Count rows silently skipped due to duplicate email
          const duplicatesSkipped = personRows.length - insertedPersons.length;
          if (duplicatesSkipped > 0) results.skipped += duplicatesSkipped;

          // 4. Upsert each unique tag name exactly once (not once per row)
          const tagRecords: Array<{ name: string; id: string }> = [];
          for (const name of tags) {
            const row = {
              name,
              tenant_id,
              createdby_id: user_id,
              updatedby_id: user_id,
            } as OperationDataType<'tags', 'insert'>;
            const tag = await this.tagsRepo.addOrGet({ row, onConflictColumn: 'name' }, trx);
            if (name === autoTag && tag?.id != null && !localAutoTagId) localAutoTagId = String(tag.id);
            if (tag?.id) tagRecords.push({ name, id: String(tag.id) });
          }

          // 5. Batch insert all tag-person mappings in one statement
          if (tagRecords.length > 0 && insertedPersons.length > 0) {
            const tagMapRows = insertedPersons.flatMap((person) =>
              tagRecords.map(({ id: tag_id }) => ({
                tenant_id,
                person_id: String(person.id),
                tag_id: tag_id as unknown as string,
                createdby_id: user_id,
                updatedby_id: user_id,
              })),
            );
            await (trx as any).insertInto('map_peoples_tags').values(tagMapRows).execute();
          }

          return {
            insertedPersons,
            tagRecords,
            householdsCreatedDelta,
            blankHouseholdId: localBlankHouseholdId,
            autoTagId: localAutoTagId,
          };
        });

        // 6. Trigger workflows outside the transaction (fire-and-forget per person)
        const workflowsController = new WorkflowsController();
        for (const person of outcome.insertedPersons) {
          const personId = String(person.id);
          importedPersonIds.push(personId);
          try {
            await workflowsController.triggerWorkflow(tenant_id, personId, 'contact_created', null);
          } catch (err) {
            logger.error({ err }, 'Failed to trigger contact_created workflow in CSV import');
          }
          for (const { name, id: tagId } of outcome.tagRecords) {
            try {
              await workflowsController.triggerTagAdded(tenant_id, personId, tagId, name);
            } catch (err) {
              logger.error({ err }, 'Failed to trigger tag_added workflow in CSV import');
            }
          }
        }

        results.inserted += outcome.insertedPersons.length;
        results.households_created += outcome.householdsCreatedDelta;
        if (outcome.blankHouseholdId) cachedBlankHouseholdId = outcome.blankHouseholdId;
        if (!autoTagId && outcome.autoTagId) autoTagId = outcome.autoTagId;
      } catch (err: unknown) {
        // If the chunk transaction fails, count all valid rows in the chunk as errors
        results.errors += validEntries.length;
        const message = err instanceof Error ? err.message : String(err);
        errorMessages.push(message);
        logger.error({ err, message }, 'Import chunk failed');
      }

      // Update intermediate counts after each chunk
      await this.importsRepo.update({
        tenant_id: tenant_id,
        id: import_id,
        row: {
          tag_id: autoTagId,
          inserted_count: results.inserted,
          error_count: results.errors,
          skipped_count: skipped + results.skipped,
          households_created: results.households_created,
          updatedby_id: user_id,
          updated_at: new Date(),
        } as any,
      });
    }

    // Log the user activity
    try {
      await this.userActivity.log({
        tenant_id,
        user_id,
        activity: 'import',
        entity: 'persons',
        quantity: results.inserted,
        metadata: {
          rows_received: rows.length,
          tags_applied: tags.slice(0, 10),
          auto_tag: autoTag,
          households_created: results.households_created,
          errors: results.errors,
          skipped: skipped + results.skipped,
          import_id,
        },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to log import activity');
    }

    if (importedPersonIds.length > 0) {
      try {
        const { queueUsageLimitCheck } = await import('../../billing/usage-limits');
        await queueUsageLimitCheck(tenant_id, this.personsRepo.db);
      } catch (err) {
        logger.error({ err }, 'Failed to queue duplicate maintenance job or usage check for imported persons');
      }
    }

    return {
      inserted: results.inserted,
      errors: results.errors,
      skipped: skipped + results.skipped,
      households_created: results.households_created,
      tag_id: autoTagId,
      errorMessages,
    };
  }

  public async removeHousehold(person_id: string, auth: IAuthKeyPayload) {
    const campaign_id = (await this.settingsController.getCurrentCampaignId(auth)) as string;
    return this.personsRepo.moveToNewHousehold({
      tenant_id: auth.tenant_id,
      person_id,
      user_id: auth.user_id,
      campaign_id,
    });
  }

  public async getPotentialDuplicates(auth: IAuthKeyPayload, options?: { page?: number; pageSize?: number }) {
    return this.personsRepo.getPotentialDuplicates(auth.tenant_id, options);
  }

  public async getDuplicateCounts(auth: IAuthKeyPayload) {
    const [people, households, companies] = await Promise.all([
      this.personsRepo.getDuplicateCount(auth.tenant_id),
      this.householdRepo.getDuplicateCount(auth.tenant_id),
      this.companiesRepo.getDuplicateCount(auth.tenant_id),
    ]);
    return { people, households, companies };
  }

  public async mergePersons(input: { target_id: string; source_id: string }, auth: IAuthKeyPayload) {
    const result = await this.personsRepo.mergePersons({
      tenant_id: auth.tenant_id,
      target_id: input.target_id,
      source_id: input.source_id,
      user_id: auth.user_id,
    });
    await this.userActivity.log({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      activity: 'merge',
      entity: 'persons',
      quantity: 1,
      metadata: {
        target_id: input.target_id,
        source_id: input.source_id,
      },
    });
    return result;
  }

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

  private sanitizePhone(v?: string) {
    if (!v) return undefined;
    const digits = v.replace(/[^0-9+]/g, '');
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

    let first_name = trim(row.first_name);
    const last_name = trim(row.last_name);
    let email = (trim(row.email) || '').toLowerCase();
    let mobile = this.sanitizePhone(row.mobile);
    const home_phone = this.sanitizePhone(row.home_phone);
    const notes = trim(row.notes);

    if (!email) {
      email = (this.findEmail(first_name || '') || this.findEmail(last_name || '') || '').toLowerCase();
    }
    if (email && !/.+@.+\..+/.test(email)) email = '';

    if (!mobile) {
      const possiblePhone = this.findPhone(first_name) || this.findPhone(last_name);
      mobile = this.sanitizePhone(possiblePhone);
    }

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
    const cleaned = noPhone
      .replace(/[,]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return cleaned || undefined;
  }

  private nameFromEmail(email: string): string | undefined {
    const local = (email || '').split('@')[0] || '';
    const token = local.split(/[._+-]/)[0] || '';
    if (!token) return undefined;
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
}
