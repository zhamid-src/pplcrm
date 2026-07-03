import { TRPCError } from '@trpc/server';
import type { Transaction } from 'kysely';
import { sql } from 'kysely';
import { BaseController } from '../../lib/base.controller';
import { EventsRepo } from './repositories/events.repo';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src/lib/auth';
import type { Models, OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { WorkflowsController } from '../workflows/controller';
import { logger } from '../../logger';

const DEFAULT_FIELDS = ['first_name', 'last_name', 'email', 'mobile', 'notes'];

const ipRsvpTimestamps = new Map<string, number[]>();
const RSVP_RATE_LIMIT_MAX = 5;
const RSVP_RATE_LIMIT_WINDOW_MS = 60 * 1000;

export class EventsController extends BaseController<'events', EventsRepo> {
  constructor() {
    super(new EventsRepo());
  }

  public async getAllEvents(auth: IAuthKeyPayload, options?: any) {
    return this.getRepo().getAllEventsWithCount({ tenant_id: auth.tenant_id, options });
  }

  public async addEvent(payload: any, auth: IAuthKeyPayload) {
    const existing = await this.getRepo()
      .db.selectFrom('events')
      .select('id')
      .where('tenant_id', '=', auth.tenant_id)
      .where('slug', '=', payload.slug)
      .executeTakeFirst();

    if (existing) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This URL slug is already in use. Please choose a different one.',
      });
    }

    const row = {
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      name: payload.name,
      description: payload.description ?? null,
      location_address: payload.location_address ?? null,
      start_time: payload.start_time,
      end_time: payload.end_time,
      capacity: payload.capacity ?? null,
      contact_email: payload.contact_email ?? null,
      contact_phone: payload.contact_phone ?? null,
      slug: payload.slug,
      is_published: payload.is_published ?? false,
      send_reminder: payload.send_reminder ?? true,
      send_registration_confirmation: payload.send_registration_confirmation ?? true,
      fields: payload.fields ?? DEFAULT_FIELDS,
    } as OperationDataType<'events', 'insert'>;

    try {
      return await this.add(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes('events_end_after_start_check')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date & time must be after the start date & time.' });
      }
      throw err;
    }
  }

  public async getEventBySlug(slug: string) {
    // NOTE: unscoped by design — public registration page: tenant is unknown until the event is resolved by slug
    return this.getRepo()
      .db.selectFrom('events')
      .selectAll()
      .where('slug', '=', slug)
      .where('is_published', '=', true)
      .executeTakeFirst();
  }

  public async getRegistrationCountForEvent(eventId: string, tenantId: string): Promise<number> {
    const row = await this.getRepo()
      .db.selectFrom('event_registrations')
      .select(({ fn }) => [fn.count('id').as('cnt')])
      .where('tenant_id', '=', tenantId)
      .where('event_id', '=', eventId)
      .where('status', '!=', 'cancelled')
      .executeTakeFirst();
    return Number(row?.cnt ?? 0);
  }

  public async getTicketTypesByEventId(eventId: string, tenantId: string) {
    return this.getRepo()
      .db.selectFrom('event_ticket_types')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('tenant_id', '=', tenantId)
      .orderBy('sort_order', 'asc')
      .execute();
  }

  public async checkSlugUnique(slug: string, excludeId: string | null, auth: IAuthKeyPayload) {
    if (!slug) return { unique: true };
    let query = this.getRepo()
      .db.selectFrom('events')
      .select('id')
      .where('tenant_id', '=', auth.tenant_id)
      .where('slug', '=', slug);
    if (excludeId) {
      query = query.where('id', '!=', excludeId);
    }
    const existing = await query.executeTakeFirst();
    return { unique: !existing };
  }

  public async updateEvent(id: string, payload: any, auth: IAuthKeyPayload) {
    if (payload.slug) {
      const existing = await this.getRepo()
        .db.selectFrom('events')
        .select('id')
        .where('tenant_id', '=', auth.tenant_id)
        .where('slug', '=', payload.slug)
        .where('id', '!=', id)
        .executeTakeFirst();

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This URL slug is already in use. Please choose a different one.',
        });
      }
    }

    const row = {
      ...payload,
      ...(payload.fields !== undefined ? { fields: payload.fields } : {}),
      updatedby_id: auth.user_id,
    } as OperationDataType<'events', 'update'>;
    let result;
    try {
      result = await this.update({ tenant_id: auth.tenant_id, id, row });
    } catch (err) {
      if (err instanceof Error && err.message.includes('events_end_after_start_check')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date & time must be after the start date & time.' });
      }
      throw err;
    }

    // Manage pending reminder jobs when the toggle changes
    if (payload.send_reminder === false) {
      try {
        await this.getRepo()
          .db.deleteFrom('background_jobs')
          .where('tenant_id', '=', auth.tenant_id)
          .where('status', '=', 'pending')
          .where(sql`payload->>'type'`, '=', 'send-event-reminder')
          .where(sql`payload->>'eventId'`, '=', String(id))
          .execute();
      } catch (err) {
        logger.error({ err }, 'Failed to clean up pending event reminders');
      }
    } else if (payload.send_reminder === true) {
      try {
        const event = await this.getRepo()
          .db.selectFrom('events')
          .select(['start_time'])
          .where('tenant_id', '=', auth.tenant_id)
          .where('id', '=', id)
          .executeTakeFirst();

        if (event) {
          const startMs = new Date(event.start_time).getTime();
          const nowMs = Date.now();
          if (startMs > nowMs) {
            const runAt = new Date(Math.max(nowMs, startMs - 24 * 60 * 60 * 1000));
            const registrations = await this.getRepo()
              .db.selectFrom('event_registrations')
              .select(['id', 'person_id'])
              .where('tenant_id', '=', auth.tenant_id)
              .where('event_id', '=', id)
              .where('status', '=', 'registered')
              .execute();

            for (const reg of registrations) {
              await this.getRepo()
                .db.deleteFrom('background_jobs')
                .where('tenant_id', '=', auth.tenant_id)
                .where('status', '=', 'pending')
                .where(sql`payload->>'type'`, '=', 'send-event-reminder')
                .where(sql`payload->>'registrationId'`, '=', String(reg.id))
                .execute();

              await this.getRepo()
                .db.insertInto('background_jobs')
                .values({
                  tenant_id: auth.tenant_id,
                  queue: 'default',
                  status: 'pending',
                  payload: JSON.stringify({
                    type: 'send-event-reminder',
                    registrationId: String(reg.id),
                    eventId: String(id),
                    personId: String(reg.person_id),
                  }),
                  run_at: runAt,
                })
                .execute();
            }
          }
        }
      } catch (err) {
        logger.error({ err }, 'Failed to re-schedule event reminders');
      }
    }

    return result;
  }

  // Ticket types

  public async getTicketTypesForEvent(event_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTicketTypesForEvent({ tenant_id: auth.tenant_id, event_id });
  }

  public async addTicketType(payload: any, auth: IAuthKeyPayload) {
    return this.getRepo().addTicketType({
      tenant_id: auth.tenant_id,
      event_id: payload.event_id,
      name: payload.name,
      description: payload.description ?? null,
      price_cents: payload.price_cents ?? 0,
      capacity: payload.capacity ?? null,
      sort_order: payload.sort_order ?? 0,
      user_id: auth.user_id,
    });
  }

  public async updateTicketType(id: string, payload: any, auth: IAuthKeyPayload) {
    return this.getRepo().updateTicketType({ tenant_id: auth.tenant_id, id, row: payload, user_id: auth.user_id });
  }

  public async deleteTicketType(id: string, auth: IAuthKeyPayload) {
    return this.getRepo().deleteTicketType({ tenant_id: auth.tenant_id, id });
  }

  // Registrations

  public async getRegistrationsForEvent(event_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getRegistrationsForEvent({ tenant_id: auth.tenant_id, event_id });
  }

  public async addRegistration(payload: any, auth: IAuthKeyPayload) {
    // Capacity check across the whole event
    const event = await this.getRepo()
      .db.selectFrom('events')
      .select(['capacity', 'send_reminder', 'send_registration_confirmation', 'start_time', 'name'])
      .where('tenant_id', '=', auth.tenant_id)
      .where('id', '=', payload.event_id)
      .executeTakeFirst();

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' });
    }

    if (event.capacity !== null) {
      const countRow = await this.getRepo()
        .db.selectFrom('event_registrations')
        .select(({ fn }) => [fn.count<number>('id').as('cnt')])
        .where('tenant_id', '=', auth.tenant_id)
        .where('event_id', '=', payload.event_id)
        .where('status', '!=', 'cancelled')
        .executeTakeFirst();
      if (Number((countRow as any)?.cnt || 0) >= event.capacity) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event is at full capacity.' });
      }
    }

    // Per-ticket-type capacity check
    if (payload.ticket_type_id) {
      const ticketType = await this.getRepo()
        .db.selectFrom('event_ticket_types')
        .select(['capacity'])
        .where('tenant_id', '=', auth.tenant_id)
        .where('id', '=', payload.ticket_type_id)
        .executeTakeFirst();

      if (ticketType && ticketType.capacity !== null) {
        const ticketCountRow = await this.getRepo()
          .db.selectFrom('event_registrations')
          .select(({ fn }) => [fn.count<number>('id').as('cnt')])
          .where('tenant_id', '=', auth.tenant_id)
          .where('ticket_type_id', '=', payload.ticket_type_id)
          .where('status', '!=', 'cancelled')
          .executeTakeFirst();
        if (Number((ticketCountRow as any)?.cnt || 0) >= ticketType.capacity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This ticket type is sold out.' });
        }
      }
    }

    const result = await this.getRepo().addRegistration({
      tenant_id: auth.tenant_id,
      event_id: payload.event_id,
      person_id: payload.person_id,
      ticket_type_id: payload.ticket_type_id ?? null,
      status: payload.status ?? 'registered',
      notes: payload.notes ?? null,
      user_id: auth.user_id,
    });

    if (result) {
      // Queue registration confirmation email
      if (event.send_registration_confirmation !== false) {
        try {
          await this.getRepo()
            .db.insertInto('background_jobs')
            .values({
              tenant_id: auth.tenant_id,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({
                type: 'send-event-registration-confirmation',
                registrationId: String(result.id),
                eventId: String(payload.event_id),
                personId: String(payload.person_id),
              }),
              run_at: new Date(),
            })
            .execute();
        } catch (err) {
          logger.error({ err }, 'Failed to queue registration confirmation');
        }
      }

      // Queue 24h reminder
      if (event.send_reminder !== false) {
        try {
          const startMs = new Date(event.start_time).getTime();
          const nowMs = Date.now();
          if (startMs > nowMs) {
            const runAt = new Date(Math.max(nowMs, startMs - 24 * 60 * 60 * 1000));
            await this.getRepo()
              .db.insertInto('background_jobs')
              .values({
                tenant_id: auth.tenant_id,
                queue: 'default',
                status: 'pending',
                payload: JSON.stringify({
                  type: 'send-event-reminder',
                  registrationId: String(result.id),
                  eventId: String(payload.event_id),
                  personId: String(payload.person_id),
                }),
                run_at: runAt,
              })
              .execute();
          }
        } catch (err) {
          logger.error({ err }, 'Failed to queue event reminder');
        }
      }

      try {
        await this.userActivity.log({
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          activity: 'assign',
          entity: 'event_registrations',
          entity_id: String(result.id),
          quantity: 1,
          metadata: { id: result.id, event_id: payload.event_id, person_id: payload.person_id },
        });
      } catch (e) {
        logger.error({ err: e }, 'Failed to log registration activity');
      }
    }

    return result;
  }

  public async checkIn(id: string, auth: IAuthKeyPayload) {
    const result = await this.getRepo().updateRegistration({
      tenant_id: auth.tenant_id,
      id,
      row: { status: 'attended', checked_in_at: new Date() },
      user_id: auth.user_id,
    });

    // Cancel pending reminder — they've already arrived
    try {
      await this.getRepo()
        .db.deleteFrom('background_jobs')
        .where('tenant_id', '=', auth.tenant_id)
        .where('status', '=', 'pending')
        .where(sql`payload->>'type'`, '=', 'send-event-reminder')
        .where(sql`payload->>'registrationId'`, '=', String(id))
        .execute();
    } catch (err) {
      logger.error({ err }, 'Failed to cancel event reminder on check-in');
    }

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'update',
        entity: 'event_registrations',
        entity_id: id,
        quantity: 1,
        metadata: { id, status: 'attended', checked_in_at: new Date().toISOString() },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to log check-in activity');
    }

    return result;
  }

  public async updateRegistration(id: string, payload: any, auth: IAuthKeyPayload) {
    const result = await this.getRepo().updateRegistration({
      tenant_id: auth.tenant_id,
      id,
      row: payload,
      user_id: auth.user_id,
    });

    // Cancel reminder if status moves away from 'registered'
    if (payload.status && payload.status !== 'registered') {
      try {
        await this.getRepo()
          .db.deleteFrom('background_jobs')
          .where('tenant_id', '=', auth.tenant_id)
          .where('status', '=', 'pending')
          .where(sql`payload->>'type'`, '=', 'send-event-reminder')
          .where(sql`payload->>'registrationId'`, '=', String(id))
          .execute();
      } catch (err) {
        logger.error({ err }, 'Failed to cancel event reminder on status change');
      }
    }

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'update',
        entity: 'event_registrations',
        entity_id: id,
        quantity: 1,
        metadata: { id, status: payload.status },
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to log registration update activity');
    }

    return result;
  }

  public async deleteRegistration(id: string, auth: IAuthKeyPayload) {
    const result = await this.getRepo().deleteRegistration({ tenant_id: auth.tenant_id, id });

    if (result) {
      try {
        await this.getRepo()
          .db.deleteFrom('background_jobs')
          .where('tenant_id', '=', auth.tenant_id)
          .where('status', '=', 'pending')
          .where(sql`payload->>'type'`, '=', 'send-event-reminder')
          .where(sql`payload->>'registrationId'`, '=', String(id))
          .execute();
      } catch (err) {
        logger.error({ err }, 'Failed to cancel event reminder on registration delete');
      }

      try {
        await this.userActivity.log({
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          activity: 'delete',
          entity: 'event_registrations',
          entity_id: id,
          quantity: 1,
          metadata: { id },
        });
      } catch (e) {
        logger.error({ err: e }, 'Failed to log registration delete activity');
      }
    }

    return result;
  }

  public async getHistoryForPerson(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getHistoryForPerson({ tenant_id: auth.tenant_id, person_id });
  }

  public async getEventStats(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getEventStats({ tenant_id: auth.tenant_id, person_id });
  }

  public async rsvpPublic(slug: string, payload: Record<string, string>, clientIp: string) {
    // Rate limiting
    const now = Date.now();
    let timestamps = ipRsvpTimestamps.get(clientIp) || [];
    timestamps = timestamps.filter((t) => now - t < RSVP_RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= RSVP_RATE_LIMIT_MAX) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Please try again in a minute.' });
    }
    timestamps.push(now);
    ipRsvpTimestamps.set(clientIp, timestamps);

    const event = await this.getEventBySlug(slug);
    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' });
    }

    // Honeypot
    if (payload['_hp'] && payload['_hp'].trim().length > 0) {
      return { success: true };
    }

    const email = payload['email']?.trim();
    if (!email) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email address is required.' });
    }

    if (new Date(event.end_time) < new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event has ended and registration is closed.' });
    }

    const tenantId = String(event.tenant_id);
    const firstName = payload['first_name']?.trim() || null;
    const lastName = payload['last_name']?.trim() || null;
    const mobile = payload['mobile']?.trim() || null;
    const notes = payload['notes']?.trim() || null;
    const street1 = payload['street1']?.trim() || null;
    const city = payload['city']?.trim() || null;
    const state = payload['state']?.trim() || null;
    const zip = payload['zip']?.trim() || null;
    const country = payload['country']?.trim() || null;

    await this.getRepo()
      .transaction()
      .execute(async (trx: Transaction<Models>) => {
        const tenantRow = await trx
          .selectFrom('tenants')
          .select(['placeholder_household_id', 'admin_id'])
          .where('id', '=', tenantId)
          .executeTakeFirst();

        const householdId = tenantRow?.placeholder_household_id;
        const creatorId = tenantRow?.admin_id;

        if (!householdId || !creatorId) {
          throw new Error('Tenant configuration is incomplete.');
        }

        // Check overall capacity
        if (event.capacity !== null) {
          const countRow = await trx
            .selectFrom('event_registrations')
            .select(({ fn }) => [fn.count<number>('id').as('cnt')])
            .where('tenant_id', '=', tenantId)
            .where('event_id', '=', String(event.id))
            .where('status', '!=', 'cancelled')
            .executeTakeFirst();
          if (Number((countRow as any)?.cnt || 0) >= event.capacity) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event is at full capacity.' });
          }
        }

        // Find or create person
        const existing = await trx
          .selectFrom('persons')
          .select(['id', 'first_name', 'last_name', 'mobile', 'notes'])
          .where('tenant_id', '=', tenantId)
          .where(sql`lower(email)`, '=', email.toLowerCase())
          .executeTakeFirst();

        let personId: string;

        if (existing) {
          personId = String(existing.id);
          const updateRow: any = { updatedby_id: creatorId, updated_at: sql`now()` };
          if (!existing.first_name && firstName) updateRow.first_name = firstName;
          if (!existing.last_name && lastName) updateRow.last_name = lastName;
          if (!existing.mobile && mobile) updateRow.mobile = mobile;
          if (notes) {
            updateRow.notes = existing.notes ? `${existing.notes}\n\nEvent RSVP notes: ${notes}` : notes;
          }
          if (Object.keys(updateRow).length > 2) {
            await trx
              .updateTable('persons')
              .set(updateRow)
              .where('tenant_id', '=', tenantId)
              .where('id', '=', existing.id)
              .execute();
          }
        } else {
          let campaignId: string | null = null;
          try {
            const campaignRow = await trx
              .selectFrom('campaigns')
              .select('id')
              .where('tenant_id', '=', tenantId)
              .orderBy('created_at', 'asc')
              .limit(1)
              .executeTakeFirst();
            campaignId = campaignRow ? String(campaignRow.id) : null;
          } catch {
            /* ignore */
          }

          const insertRow: any = {
            tenant_id: tenantId,
            household_id: householdId,
            createdby_id: creatorId,
            updatedby_id: creatorId,
            first_name: firstName,
            last_name: lastName,
            email,
            mobile,
            notes,
            street1,
            city,
            state,
            zip,
            country,
          };
          if (campaignId) insertRow.campaign_id = campaignId as any;

          const insertRes = await trx.insertInto('persons').values(insertRow).returning('id').executeTakeFirstOrThrow();
          personId = String(insertRes.id);

          try {
            const workflowsCtrl = new WorkflowsController();
            await workflowsCtrl.triggerWorkflow(tenantId, personId, 'contact_created', null, trx);
          } catch (err) {
            logger.error({ err }, 'Failed to trigger contact_created workflow in rsvpPublic');
          }
        }

        // Check duplicate registration
        const existingReg = await trx
          .selectFrom('event_registrations')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('event_id', '=', String(event.id))
          .where('person_id', '=', personId)
          .where('status', '!=', 'cancelled')
          .executeTakeFirst();

        if (existingReg) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You are already registered for this event.' });
        }

        // Insert registration
        const reg = await trx
          .insertInto('event_registrations')
          .values({
            tenant_id: tenantId,
            event_id: String(event.id) as any,
            person_id: personId,
            ticket_type_id: null,
            status: 'registered',
            notes: notes ?? null,
            createdby_id: creatorId,
            updatedby_id: creatorId,
          })
          .returning('id')
          .executeTakeFirstOrThrow();

        // Queue confirmation email
        if ((event as any).send_registration_confirmation !== false) {
          try {
            await trx
              .insertInto('background_jobs')
              .values({
                tenant_id: tenantId,
                queue: 'default',
                status: 'pending',
                payload: JSON.stringify({
                  type: 'send-event-registration-confirmation',
                  registrationId: String(reg.id),
                  eventId: String(event.id),
                  personId,
                }),
                run_at: new Date(),
              })
              .execute();
          } catch (err) {
            logger.error({ err }, 'Failed to queue RSVP confirmation');
          }
        }

        // Queue 24h reminder
        if ((event as any).send_reminder !== false) {
          try {
            const startMs = new Date(event.start_time).getTime();
            const nowMs = Date.now();
            if (startMs > nowMs) {
              const runAt = new Date(Math.max(nowMs, startMs - 24 * 60 * 60 * 1000));
              await trx
                .insertInto('background_jobs')
                .values({
                  tenant_id: tenantId,
                  queue: 'default',
                  status: 'pending',
                  payload: JSON.stringify({
                    type: 'send-event-reminder',
                    registrationId: String(reg.id),
                    eventId: String(event.id),
                    personId,
                  }),
                  run_at: runAt,
                })
                .execute();
            }
          } catch (err) {
            logger.error({ err }, 'Failed to queue event reminder in rsvpPublic');
          }
        }
      });

    return { success: true };
  }
}
