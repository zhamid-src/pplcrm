import { AddWebFormType, IAuthKeyPayload, UpdateWebFormType } from '@common';
import { BaseController } from '../../lib/base.controller';
import { WebFormsRepo } from './repositories/web-forms.repo';
import { Models } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { TRPCError } from '@trpc/server';

import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';

// Sliding window memory for rate-limiting
const ipSubmissionTimestamps = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export class WebFormsController extends BaseController<'web_forms', WebFormsRepo> {
  private mailService = new TransactionalEmailService();

  constructor() {
    super(new WebFormsRepo());
  }

  public async getFormPublic(id: string) {
    return this.getRepo().getByIdPublic(id);
  }

  public async addForm(payload: AddWebFormType, auth: IAuthKeyPayload) {
    const row = {
      tenant_id: auth.tenant_id,
      name: payload.name,
      description: payload.description ?? null,
      redirect_url: payload.redirect_url ?? null,
      target_tags: payload.target_tags ? JSON.stringify(payload.target_tags) : null,
      target_lists: payload.target_lists ? JSON.stringify(payload.target_lists) : null,
      status: payload.status ?? 'active',
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    };
    return this.add(row as any);
  }

  public async updateForm(id: string, payload: UpdateWebFormType, auth: IAuthKeyPayload) {
    const row: any = {
      updatedby_id: auth.user_id,
      updated_at: new Date(),
    };
    if (payload.name !== undefined) row.name = payload.name;
    if (payload.description !== undefined) row.description = payload.description;
    if (payload.redirect_url !== undefined) row.redirect_url = payload.redirect_url;
    if (payload.target_tags !== undefined) row.target_tags = payload.target_tags ? JSON.stringify(payload.target_tags) : null;
    if (payload.target_lists !== undefined) row.target_lists = payload.target_lists ? JSON.stringify(payload.target_lists) : null;
    if (payload.status !== undefined) row.status = payload.status;

    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row,
    });
  }

  public async submitFormPublic(formId: string, payload: Record<string, string>, clientIp: string) {
    // 1. Rate limiting check
    const now = Date.now();
    let timestamps = ipSubmissionTimestamps.get(clientIp) || [];
    timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= RATE_LIMIT_MAX) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again in a minute.',
      });
    }
    timestamps.push(now);
    ipSubmissionTimestamps.set(clientIp, timestamps);

    // 2. Fetch Form by ID
    const form = await this.getRepo().getByIdPublic(formId);
    if (!form || form.status !== 'active') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Web form not found or inactive.',
      });
    }

    const tenantId = String(form.tenant_id);

    // 3. Honeypot check
    if (payload['_hp'] && payload['_hp'].trim().length > 0) {
      console.warn(`Spam bot detected from IP ${clientIp} for form ${formId}`);
      return { redirect_url: form.redirect_url || null };
    }

    // 4. Validate email
    const email = payload['email']?.trim();
    if (!email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email address is required.',
      });
    }

    // 5. Gather submission fields
    const firstName = payload['first_name'] || payload['firstName'] || null;
    const lastName = payload['last_name'] || payload['lastName'] || null;
    const mobile = payload['mobile'] || payload['phone'] || null;
    const notes = payload['notes'] || payload['message'] || null;

    // 6. Find or Create person & apply merges/tags
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
          updateRow.notes = `${existing.notes}\n\nSubmission notes: ${notes}`;
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

      // Add target custom tags & read-only system tag
      const targetTags: string[] = Array.isArray(form.target_tags) ? form.target_tags : JSON.parse((form.target_tags as any) || '[]');
      const systemTagName = `Source: ${form.name}`;
      const allTagsToApply = [...targetTags, systemTagName];

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

      // Add target lists
      const targetLists: string[] = Array.isArray(form.target_lists) ? form.target_lists : JSON.parse((form.target_lists as any) || '[]');
      for (const listId of targetLists) {
        if (!listId) continue;
        const listExists = await trx.selectFrom('lists')
          .select('id')
          .where('tenant_id', '=', tenantId as any)
          .where('id', '=', listId as any)
          .executeTakeFirst();

        if (!listExists) continue;

        const inList = await trx.selectFrom('map_lists_persons')
          .select('id')
          .where('tenant_id', '=', tenantId as any)
          .where('person_id', '=', personId as any)
          .where('list_id', '=', listId as any)
          .executeTakeFirst();

        if (!inList) {
          await trx.insertInto('map_lists_persons')
            .values({
              tenant_id: tenantId as any,
              person_id: personId as any,
              list_id: listId as any,
              createdby_id: creatorId as any,
              updatedby_id: creatorId as any,
            })
            .execute();
        }
      }

      // Log user activity
      await trx.insertInto('user_activity')
        .values({
          tenant_id: tenantId,
          user_id: creatorId,
          activity: 'submission',
          entity: 'web_forms',
          entity_id: formId,
          quantity: 1,
          metadata: JSON.stringify({ person_id: personId, email }),
          createdby_id: creatorId,
          updatedby_id: creatorId,
        })
        .execute();
    });

    try {
      await this.mailService.sendMail({
        to: email,
        subject: `Thank you for your submission to ${form.name}`,
        text: `Hi ${firstName || 'there'},\n\nThank you for submitting our form "${form.name}". We have received your request and our team will follow up with you soon.`,
        html: `<p>Hi ${firstName || 'there'},</p><p>Thank you for submitting our form <strong>"${form.name}"</strong>. We have received your request and our team will follow up with you soon.</p>`,
      });

      const admin = await this.getRepo().db.selectFrom('authusers')
        .select(['email', 'first_name'])
        .where('tenant_id', '=', tenantId as any)
        .limit(1)
        .executeTakeFirst();

      if (admin && admin.email) {
        await this.mailService.sendMail({
          to: admin.email,
          subject: `[ALERT] New Lead Submission on ${form.name}`,
          text: `Hi ${admin.first_name || 'Admin'},\n\nYou have received a new submission on form "${form.name}" from ${firstName || ''} ${lastName || ''} (${email}).\n\nNotes:\n${notes || 'None'}`,
          html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>You have received a new submission on form <strong>"${form.name}"</strong> from <strong>${firstName || ''} ${lastName || ''}</strong> (${email}).</p><p><strong>Notes:</strong><br>${notes || 'None'}</p>`,
        });
      }
    } catch (mailErr) {
      console.error('Failed to send web form submission notification emails', mailErr);
    }

    return { redirect_url: form.redirect_url || null };
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
