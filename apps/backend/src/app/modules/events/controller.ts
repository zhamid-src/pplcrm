import { TRPCError } from '@trpc/server';
import { sql } from 'kysely';
import { BaseController } from '../../lib/base.controller';
import { EventsRepo } from './repositories/events.repo';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src/lib/auth';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';

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
      .where('tenant_id', '=', auth.tenant_id as any)
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
    } as OperationDataType<'events', 'insert'>;

    try {
      return await this.add(row);
    } catch (err: any) {
      if (err?.message?.includes('events_end_after_start_check')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date & time must be after the start date & time.' });
      }
      throw err;
    }
  }

  public async getEventBySlug(slug: string) {
    return this.getRepo()
      .db.selectFrom('events')
      .selectAll()
      .where('slug', '=', slug)
      .where('is_published', '=', true as any)
      .executeTakeFirst();
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
      .where('tenant_id', '=', auth.tenant_id as any)
      .where('slug', '=', slug);
    if (excludeId) {
      query = query.where('id', '!=', excludeId as any);
    }
    const existing = await query.executeTakeFirst();
    return { unique: !existing };
  }

  public async updateEvent(id: string, payload: any, auth: IAuthKeyPayload) {
    if (payload.slug) {
      const existing = await this.getRepo()
        .db.selectFrom('events')
        .select('id')
        .where('tenant_id', '=', auth.tenant_id as any)
        .where('slug', '=', payload.slug)
        .where('id', '!=', id as any)
        .executeTakeFirst();

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This URL slug is already in use. Please choose a different one.',
        });
      }
    }

    const row = { ...payload, updatedby_id: auth.user_id } as OperationDataType<'events', 'update'>;
    let result;
    try {
      result = await this.update({ tenant_id: auth.tenant_id, id, row });
    } catch (err: any) {
      if (err?.message?.includes('events_end_after_start_check')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date & time must be after the start date & time.' });
      }
      throw err;
    }

    // Manage pending reminder jobs when the toggle changes
    if (payload.send_reminder === false) {
      try {
        await this.getRepo()
          .db.deleteFrom('background_jobs' as any)
          .where('tenant_id', '=', auth.tenant_id)
          .where('status', '=', 'pending')
          .where(sql`payload->>'type'`, '=', 'send-event-reminder')
          .where(sql`payload->>'eventId'`, '=', String(id))
          .execute();
      } catch (err) {
        console.error('Failed to clean up pending event reminders', err);
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
                .db.deleteFrom('background_jobs' as any)
                .where('tenant_id', '=', auth.tenant_id)
                .where('status', '=', 'pending')
                .where(sql`payload->>'type'`, '=', 'send-event-reminder')
                .where(sql`payload->>'registrationId'`, '=', String(reg.id))
                .execute();

              await this.getRepo()
                .db.insertInto('background_jobs' as any)
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
        console.error('Failed to re-schedule event reminders', err);
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
            .db.insertInto('background_jobs' as any)
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
          console.error('Failed to queue registration confirmation', err);
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
              .db.insertInto('background_jobs' as any)
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
          console.error('Failed to queue event reminder', err);
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
        console.error('Failed to log registration activity', e);
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
        .db.deleteFrom('background_jobs' as any)
        .where('tenant_id', '=', auth.tenant_id)
        .where('status', '=', 'pending')
        .where(sql`payload->>'type'`, '=', 'send-event-reminder')
        .where(sql`payload->>'registrationId'`, '=', String(id))
        .execute();
    } catch (err) {
      console.error('Failed to cancel event reminder on check-in', err);
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
      console.error('Failed to log check-in activity', e);
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
          .db.deleteFrom('background_jobs' as any)
          .where('tenant_id', '=', auth.tenant_id)
          .where('status', '=', 'pending')
          .where(sql`payload->>'type'`, '=', 'send-event-reminder')
          .where(sql`payload->>'registrationId'`, '=', String(id))
          .execute();
      } catch (err) {
        console.error('Failed to cancel event reminder on status change', err);
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
      console.error('Failed to log registration update activity', e);
    }

    return result;
  }

  public async deleteRegistration(id: string, auth: IAuthKeyPayload) {
    const result = await this.getRepo().deleteRegistration({ tenant_id: auth.tenant_id, id });

    if (result) {
      try {
        await this.getRepo()
          .db.deleteFrom('background_jobs' as any)
          .where('tenant_id', '=', auth.tenant_id)
          .where('status', '=', 'pending')
          .where(sql`payload->>'type'`, '=', 'send-event-reminder')
          .where(sql`payload->>'registrationId'`, '=', String(id))
          .execute();
      } catch (err) {
        console.error('Failed to cancel event reminder on registration delete', err);
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
        console.error('Failed to log registration delete activity', e);
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
}
