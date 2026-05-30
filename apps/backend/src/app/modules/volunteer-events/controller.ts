import { BaseController } from '../../lib/base.controller';
import { VolunteerEventsRepo } from './repositories/volunteer-events.repo';
import type { IAuthKeyPayload } from 'common/src/lib/auth';
import type { OperationDataType, Models } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { TRPCError } from '@trpc/server';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';
import { env } from '../../../env';
import { createHmac } from 'crypto';

const ipSignupTimestamps = new Map<string, number[]>();
const SIGNUP_RATE_LIMIT_MAX = 5;
const SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export class VolunteerEventsController extends BaseController<'volunteer_events', VolunteerEventsRepo> {
  private mailService = new TransactionalEmailService();

  constructor() {
    super(new VolunteerEventsRepo());
  }

  /**
   * Get all volunteer events with volunteer signup counts.
   */
  public async getAllEvents(auth: IAuthKeyPayload, options?: any) {
    return this.getRepo().getAllEventsWithCount({
      tenant_id: auth.tenant_id,
      options,
    });
  }

  /**
   * Create a new volunteer event.
   */
  public async addEvent(payload: any, auth: IAuthKeyPayload) {
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
      is_private: payload.is_private ?? false,
    } as OperationDataType<'volunteer_events', 'insert'>;
    return this.add(row);
  }

  /**
   * Update an existing volunteer event.
   */
  public async updateEvent(id: string, payload: any, auth: IAuthKeyPayload) {
    const row = {
      ...payload,
      updatedby_id: auth.user_id,
    } as OperationDataType<'volunteer_events', 'update'>;
    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row,
    });
  }

  /**
   * Get roster shifts for an event.
   */
  public async getShiftsForEvent(event_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getShiftsForEvent({
      tenant_id: auth.tenant_id,
      event_id,
    });
  }

  /**
   * Sign up a person for a volunteer event.
   */
  public async signupVolunteer(payload: any, auth: IAuthKeyPayload) {
    const result = await this.getRepo().signupVolunteer({
      tenant_id: auth.tenant_id,
      event_id: payload.event_id,
      person_id: payload.person_id,
      status: payload.status,
      hours_worked: payload.hours_worked,
      notes: payload.notes,
      user_id: auth.user_id,
    });

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'assign',
        entity: 'volunteer_shifts',
        entity_id: result?.id ? String(result.id) : null,
        quantity: 1,
        metadata: { id: result?.id, event_id: payload.event_id, person_id: payload.person_id },
      });
    } catch (e) {
      console.error('Failed to log shift signup activity', e);
    }

    return result;
  }

  /**
   * Update shift status/details.
   */
  public async updateShift(id: string, payload: any, auth: IAuthKeyPayload) {
    const result = await this.getRepo().updateShift({
      tenant_id: auth.tenant_id,
      id,
      row: payload,
      user_id: auth.user_id,
    });

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'update',
        entity: 'volunteer_shifts',
        entity_id: id,
        quantity: 1,
        metadata: { id, status: payload.status },
      });
    } catch (e) {
      console.error('Failed to log shift update activity', e);
    }

    return result;
  }

  /**
   * Delete/cancel a shift.
   */
  public async deleteShift(id: string, auth: IAuthKeyPayload) {
    const result = await this.getRepo().deleteShift({
      tenant_id: auth.tenant_id,
      id,
    });

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'delete',
        entity: 'volunteer_shifts',
        entity_id: id,
        quantity: 1,
        metadata: { id },
      });
    } catch (e) {
      console.error('Failed to log shift delete activity', e);
    }

    return result;
  }

  /**
   * Get shift history for a person.
   */
  public async getHistoryForPerson(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getHistoryForPerson({
      tenant_id: auth.tenant_id,
      person_id,
    });
  }

  /**
   * Get total volunteer statistics for a person.
   */
  public async getVolunteerStats(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getVolunteerStats({
      tenant_id: auth.tenant_id,
      person_id,
    });
  }

  /**
   * Public: Get tenant details.
   */
  public async getTenantPublic(tenantId: string) {
    return this.getRepo().db.selectFrom('tenants')
      .select(['name'])
      .where('id', '=', tenantId as any)
      .executeTakeFirst();
  }

  /**
   * Public: Get all upcoming events for a tenant.
   */
  public async getUpcomingEventsPublic(tenantId: string) {
    return this.getRepo().db
      .selectFrom('volunteer_events')
      .select([
        'volunteer_events.id',
        'volunteer_events.tenant_id',
        'volunteer_events.name',
        'volunteer_events.description',
        'volunteer_events.location_address',
        'volunteer_events.start_time',
        'volunteer_events.end_time',
        'volunteer_events.capacity',
        'volunteer_events.contact_email',
        'volunteer_events.contact_phone',
        'volunteer_events.is_private',
      ])
      .select((eb) => [
        eb
          .selectFrom('volunteer_shifts')
          .whereRef('volunteer_shifts.event_id', '=', 'volunteer_events.id')
          .select(({ fn }) => [fn.count<number>('volunteer_shifts.id').as('volunteers_count')])
          .as('volunteers_count'),
      ])
      .where('volunteer_events.tenant_id', '=', tenantId as any)
      .where('volunteer_events.end_time', '>=', new Date())
      .where('volunteer_events.is_private', '=', false)
      .orderBy('volunteer_events.start_time', 'asc')
      .execute();
  }

  /**
   * Public: Get event details and current signup count.
   */
  public async getEventPublic(eventId: string) {
    return this.getRepo().db
      .selectFrom('volunteer_events')
      .select([
        'volunteer_events.id',
        'volunteer_events.tenant_id',
        'volunteer_events.name',
        'volunteer_events.description',
        'volunteer_events.location_address',
        'volunteer_events.start_time',
        'volunteer_events.end_time',
        'volunteer_events.capacity',
        'volunteer_events.contact_email',
        'volunteer_events.contact_phone',
        'volunteer_events.is_private',
      ])
      .select((eb) => [
        eb
          .selectFrom('volunteer_shifts')
          .whereRef('volunteer_shifts.event_id', '=', 'volunteer_events.id')
          .select(({ fn }) => [fn.count<number>('volunteer_shifts.id').as('volunteers_count')])
          .as('volunteers_count'),
      ])
      .where('volunteer_events.id', '=', eventId as any)
      .executeTakeFirst();
  }

  public getTenantSlug(tenantId: string): string {
    return createHmac('sha256', env.sharedSecret)
      .update(tenantId)
      .digest('hex')
      .slice(0, 16);
  }

  public override async getOneById(input: { tenant_id: string; id: string }) {
    const event = await super.getOneById(input) as any;
    if (event) {
      const slug = this.getTenantSlug(input.tenant_id);
      return {
        ...event,
        public_url: `/api/events/view/${event.id}`,
        tenant_public_url: `/api/events/org/${slug}`,
      } as any;
    }
    return event;
  }

  /**
   * Public: Retrieve a tenant from its secure cryptographic slug.
   */
  public async getTenantFromSlug(slug: string) {
    const tenants = await this.getRepo().db.selectFrom('tenants')
      .select(['id', 'name'])
      .execute();
    return tenants.find((t) => this.getTenantSlug(String(t.id)) === slug);
  }

  /**
   * Public: Sign up a volunteer for an event.
   */
  public async signupVolunteerPublic(eventId: string, payload: Record<string, string>, clientIp: string) {
    // 1. Rate limiting check
    const now = Date.now();
    let timestamps = ipSignupTimestamps.get(clientIp) || [];
    timestamps = timestamps.filter((t) => now - t < SIGNUP_RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= SIGNUP_RATE_LIMIT_MAX) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again in a minute.',
      });
    }
    timestamps.push(now);
    ipSignupTimestamps.set(clientIp, timestamps);

    // 2. Fetch Event by ID
    const event = await this.getEventPublic(eventId);
    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found.',
      });
    }

    const tenantId = String(event.tenant_id);

    // 3. Honeypot check
    if (payload['_hp'] && payload['_hp'].trim().length > 0) {
      console.warn(`Spam bot detected from IP ${clientIp} for event ${eventId}`);
      return { success: true }; // Silent mock success
    }

    // 4. Validate email
    const email = payload['email']?.trim();
    if (!email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email address is required.',
      });
    }

    // 5. Check capacity limit
    const currentCount = Number(event.volunteers_count || 0);
    if (event.capacity !== null && currentCount >= event.capacity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This event is already at full capacity.',
      });
    }

    const firstName = payload['first_name'] || payload['firstName'] || null;
    const lastName = payload['last_name'] || payload['lastName'] || null;
    const mobile = payload['mobile'] || payload['phone'] || null;
    const notes = payload['notes'] || payload['message'] || null;

    // 6. Transaction to find/create person, tags, and shift
    await this.getRepo().transaction().execute(async (trx: Transaction<Models>) => {
      const tenantRow = await trx.selectFrom('tenants')
        .select(['placeholder_household_id', 'admin_id'])
        .where('id', '=', tenantId as any)
        .executeTakeFirst();

      const householdId = tenantRow?.placeholder_household_id;
      const creatorId = tenantRow?.admin_id || '1';

      if (!householdId) {
        throw new Error('Tenant placeholder household is not configured.');
      }

      const campaignId = await this.getCampaignId(tenantId, trx);

      // Check if email already exists
      const existing = await trx.selectFrom('persons')
        .select(['id', 'first_name', 'last_name', 'mobile', 'notes'])
        .where('tenant_id', '=', tenantId as any)
        .where(sql`lower(email)`, '=', email.toLowerCase())
        .executeTakeFirst();

      let personId: string;

      if (existing) {
        personId = String(existing.id);
        const updateRow: any = {
          updatedby_id: creatorId,
          updated_at: sql`now()`,
        };
        if (!existing.first_name && firstName) updateRow.first_name = firstName;
        if (!existing.last_name && lastName) updateRow.last_name = lastName;
        if (!existing.mobile && mobile) updateRow.mobile = mobile;
        if (!existing.notes && notes) {
          updateRow.notes = notes;
        } else if (existing.notes && notes) {
          updateRow.notes = `${existing.notes}\n\nVolunteer Signup notes: ${notes}`;
        }

        if (Object.keys(updateRow).length > 2) {
          await trx.updateTable('persons')
            .set(updateRow)
            .where('tenant_id', '=', tenantId as any)
            .where('id', '=', existing.id)
            .execute();
        }
      } else {
        const insertRow = {
          tenant_id: tenantId as any,
          campaign_id: campaignId as any,
          household_id: householdId as any,
          createdby_id: creatorId as any,
          updatedby_id: creatorId as any,
          first_name: firstName,
          last_name: lastName,
          email: email,
          mobile: mobile,
          notes: notes,
        };
        const insertRes = await trx.insertInto('persons')
          .values(insertRow)
          .returning('id')
          .executeTakeFirstOrThrow();
        personId = String(insertRes.id);
      }

      // Check if shift already exists
      const existingShift = await trx.selectFrom('volunteer_shifts')
        .select('id')
        .where('tenant_id', '=', tenantId as any)
        .where('event_id', '=', eventId as any)
        .where('person_id', '=', personId as any)
        .executeTakeFirst();

      if (existingShift) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already signed up for this event.',
        });
      }

      // Add tag "volunteer" and "Event: <Event Name>"
      const allTagsToApply = ['volunteer', `Event: ${event.name}`];
      for (const tagName of allTagsToApply) {
        if (!tagName.trim()) continue;

        let tag = await trx.selectFrom('tags')
          .select('id')
          .where('tenant_id', '=', tenantId as any)
          .where('name', '=', tagName.trim())
          .where('type', '=', 'tag')
          .executeTakeFirst();

        if (!tag) {
          const insertTagRes = await trx.insertInto('tags')
            .values({
              tenant_id: tenantId as any,
              name: tagName.trim(),
              type: 'tag',
              deletable: true,
              createdby_id: creatorId as any,
              updatedby_id: creatorId as any,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          tag = { id: insertTagRes.id };
        }

        const mapExists = await trx.selectFrom('map_peoples_tags')
          .select('id')
          .where('tenant_id', '=', tenantId as any)
          .where('person_id', '=', personId as any)
          .where('tag_id', '=', tag.id as any)
          .executeTakeFirst();

        if (!mapExists) {
          await trx.insertInto('map_peoples_tags')
            .values({
              tenant_id: tenantId as any,
              person_id: personId as any,
              tag_id: tag.id as any,
              createdby_id: creatorId as any,
              updatedby_id: creatorId as any,
            })
            .execute();
        }
      }

      // Insert Shift
      await trx.insertInto('volunteer_shifts')
        .values({
          tenant_id: tenantId as any,
          event_id: eventId as any,
          person_id: personId as any,
          status: 'signed_up',
          notes: notes,
          createdby_id: creatorId as any,
          updatedby_id: creatorId as any,
        })
        .execute();

      // Log user activity
      await trx.insertInto('user_activity')
        .values({
          tenant_id: tenantId,
          user_id: creatorId,
          activity: 'signup',
          entity: 'volunteer_events',
          entity_id: eventId,
          quantity: 1,
          metadata: JSON.stringify({ person_id: personId, email }),
          createdby_id: creatorId,
          updatedby_id: creatorId,
        })
        .execute();
    });

    // 7. Send Emails
    try {
      const startFormatted = new Date(event.start_time).toLocaleString();
      const endFormatted = new Date(event.end_time).toLocaleString();

      await this.mailService.sendMail({
        to: email,
        subject: `Volunteer Signup Confirmation: ${event.name}`,
        text: `Hi ${firstName || 'there'},\n\nThank you for signing up to volunteer for "${event.name}"!\n\nDetails:\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}\n\nWe look forward to seeing you there!`,
        html: `<p>Hi ${firstName || 'there'},</p><p>Thank you for signing up to volunteer for <strong>"${event.name}"</strong>!</p><p><strong>Details:</strong><br>Date & Time: ${startFormatted} - ${endFormatted}<br>Location: ${event.location_address || 'TBD'}</p><p>We look forward to seeing you there!</p>`,
      });

      const admin = await this.getRepo().db.selectFrom('authusers')
        .select(['email', 'first_name'])
        .where('tenant_id', '=', tenantId as any)
        .limit(1)
        .executeTakeFirst();

      if (admin && admin.email) {
        await this.mailService.sendMail({
          to: admin.email,
          subject: `[ALERT] New Volunteer Signup for ${event.name}`,
          text: `Hi ${admin.first_name || 'Admin'},\n\nA new constituent has signed up to volunteer for "${event.name}".\n\nName: ${firstName || ''} ${lastName || ''}\nEmail: ${email}\nPhone: ${mobile || 'N/A'}\nNotes: ${notes || 'None'}`,
          html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>A new constituent has signed up to volunteer for <strong>"${event.name}"</strong>.</p><p><strong>Volunteer Details:</strong><br>Name: ${firstName || ''} ${lastName || ''}<br>Email: ${email}<br>Phone: ${mobile || 'N/A'}<br>Notes: ${notes || 'None'}</p>`,
        });
      }
    } catch (mailErr) {
      console.error('Failed to send volunteer signup notification emails', mailErr);
    }

    return { success: true };
  }

  private async getCampaignId(tenantId: string, trx: Transaction<Models>): Promise<string> {
    const row = await trx.selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId as any)
      .where('key', '=', 'current_campaign')
      .executeTakeFirst();

    if (row) {
      const value = row.value;
      if (typeof value === 'number' || typeof value === 'string') {
        return String(value);
      }
      if (value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
        const id = (value as Record<string, unknown>)['id'];
        if (typeof id === 'number' || typeof id === 'string') {
          return String(id);
        }
      }
    }

    const campaignRow = await trx.selectFrom('campaigns')
      .select('id')
      .where('tenant_id', '=', tenantId as any)
      .limit(1)
      .executeTakeFirst();

    if (campaignRow) {
      return String(campaignRow.id);
    }

    throw new Error('No campaign found for this tenant.');
  }
}
