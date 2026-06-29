import type { AddWebFormType, IAuthKeyPayload, UpdateWebFormType } from '../../../../../../libs/common/src';
import { BaseController } from '../../lib/base.controller';
import { WebFormsRepo } from './repositories/web-forms.repo';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { type Transaction, sql } from 'kysely';
import { TRPCError } from '@trpc/server';
import { env } from '../../../env';
import { createSigner, createVerifier } from 'fast-jwt';
import { fingerprintFull, fingerprintStreet } from '../../lib/address-normalize';
import { HouseholdRepo } from '../households/repositories/households.repo';

import { WorkflowsController } from '../workflows/controller';
import { DonationsController } from '../donations/controller';
import { logger } from '../../logger';

// Sliding window memory for rate-limiting
const ipSubmissionTimestamps = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export class WebFormsController extends BaseController<'web_forms', WebFormsRepo> {
  constructor() {
    super(new WebFormsRepo());
  }

  public override async getOneById(input: { tenant_id: string; id: string }) {
    const form = await super.getOneById(input);
    if (!form) return form;
    return this.resolveCreatorAndUpdater(input.tenant_id, form);
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
      fields: payload.fields ? JSON.stringify(payload.fields) : null,
      status: payload.status ?? 'active',
      send_confirmation: payload.send_confirmation ?? true,
      send_alert: payload.send_alert ?? true,
      form_type: payload.form_type ?? 'standard',
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    };
    return this.add(row as any);
  }

  public async updateForm(id: string, payload: UpdateWebFormType, auth: IAuthKeyPayload) {
    const existing = await this.getOneById({ tenant_id: auth.tenant_id, id });
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Web form not found.',
      });
    }

    const row: any = {
      updatedby_id: auth.user_id,
      updated_at: new Date(),
    };
    if (payload.name !== undefined) row.name = payload.name;
    if (payload.description !== undefined) row.description = payload.description;
    if (payload.redirect_url !== undefined) row.redirect_url = payload.redirect_url;
    if (payload.target_tags !== undefined)
      row.target_tags = payload.target_tags ? JSON.stringify(payload.target_tags) : null;
    if (payload.target_lists !== undefined)
      row.target_lists = payload.target_lists ? JSON.stringify(payload.target_lists) : null;
    if (payload.fields !== undefined) row.fields = payload.fields ? JSON.stringify(payload.fields) : null;
    if (payload.status !== undefined) row.status = payload.status;
    if (payload.send_confirmation !== undefined) row.send_confirmation = payload.send_confirmation;
    if (payload.send_alert !== undefined) row.send_alert = payload.send_alert;

    const rawPayload = payload as any;
    if (rawPayload.form_type !== undefined && rawPayload.form_type !== existing.form_type) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Form type cannot be changed after the form has been created.',
      });
    }

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
    // Prune empty keys to prevent unbounded Map growth
    if (timestamps.length > 0) {
      ipSubmissionTimestamps.set(clientIp, timestamps);
    } else {
      ipSubmissionTimestamps.delete(clientIp);
    }

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
      logger.warn(`Spam bot detected from IP ${clientIp} for form ${formId}`);
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

    // Parse configuration fields
    const formFields: string[] = form.fields
      ? Array.isArray(form.fields)
        ? (form.fields as string[])
        : JSON.parse(String(form.fields))
      : ['first_name', 'last_name', 'email', 'mobile', 'notes'];

    // Map payload key aliases helper
    const getPayloadValue = (key: string): string => {
      let value = '';
      if (key === 'first_name') value = payload['first_name'] || payload['firstName'] || '';
      else if (key === 'last_name') value = payload['last_name'] || payload['lastName'] || '';
      else if (key === 'street1') value = payload['street1'] || payload['street_address'] || '';
      else if (key === 'zip') value = payload['zip'] || payload['postal_code'] || '';
      else if (key === 'country') value = payload['country'] || payload['residency_country'] || '';
      else if (key === 'state') value = payload['state'] || payload['province'] || payload['residency_province'] || '';
      else value = payload[key] || '';
      return String(value).trim();
    };

    // Validate user-configured required fields for standard forms
    if (form.form_type !== 'donation' && form.form_type !== 'recurring_donation') {
      const fieldLabels: Record<string, string> = {
        first_name: 'First Name',
        last_name: 'Last Name',
        mobile: 'Mobile / Phone',
        notes: 'Notes / Message',
        street1: 'Street Address',
        city: 'City',
        state: 'State / Province',
        zip: 'Zip / Postal Code',
        country: 'Country',
      };

      for (const rawField of formFields) {
        if (rawField.endsWith(':required')) {
          const fieldName = rawField.replace(':required', '');
          const val = getPayloadValue(fieldName);
          if (!val) {
            const label = fieldLabels[fieldName] || fieldName;
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `${label} is required.`,
            });
          }
        }
      }
    }

    // Parse and validate donation fields if form is a donation or recurring_donation form
    let amountCents = 0;
    let monthlyAmountCents = 0;
    let country = '';
    let state = '';
    if (form.form_type === 'donation' || form.form_type === 'recurring_donation') {
      const firstName = (payload['first_name'] || payload['firstName'] || '').trim();
      const lastName = (payload['last_name'] || payload['lastName'] || '').trim();
      if (!firstName || !lastName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'First name and last name are required for donations.',
        });
      }

      const street1 = (payload['street1'] || payload['street_address'] || '').trim();
      const city = (payload['city'] || '').trim();
      const zip = (payload['zip'] || payload['postal_code'] || '').trim();
      country = (payload['country'] || payload['residency_country'] || '').trim();
      state = (payload['state'] || payload['province'] || payload['residency_province'] || '').trim();

      if (!street1 || !city || !zip || !country || !state) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Street address, city, state/province, zip/postal code, and country of residence are required for donations.',
        });
      }

      // Check if email already exists to run eligibility checks
      const existing = await this.getRepo()
        .db.selectFrom('persons')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where(sql`lower(email)`, '=', email.toLowerCase())
        .executeTakeFirst();

      const donationsController = new DonationsController();

      if (form.form_type === 'donation') {
        const amountStr = payload['amount'] || payload['donation_amount'] || '';
        const amountDollars = parseFloat(amountStr);
        if (isNaN(amountDollars) || amountDollars <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A valid donation amount is required.' });
        }
        amountCents = Math.round(amountDollars * 100);

        const check = await donationsController.checkEligibility(
          tenantId,
          existing ? String(existing.id) : '0',
          amountCents,
          { country, state },
        );
        if (!check.eligible) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: check.reason });
        }
      } else {
        // recurring_donation
        const amountStr = payload['monthly_amount'] || payload['amount'] || '';
        const amountDollars = parseFloat(amountStr);
        if (isNaN(amountDollars) || amountDollars <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A valid monthly donation amount is required.' });
        }
        monthlyAmountCents = Math.round(amountDollars * 100);

        const check = await donationsController.checkEligibility(
          tenantId,
          existing ? String(existing.id) : '0',
          monthlyAmountCents,
          { country, state },
          { isRecurring: true },
        );
        if (!check.eligible) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: check.reason });
        }
      }
    }

    // 5. Gather submission fields
    const firstName = payload['first_name'] || payload['firstName'] || null;
    const lastName = payload['last_name'] || payload['lastName'] || null;
    const mobile = payload['mobile'] || payload['phone'] || null;
    const notes = payload['notes'] || payload['message'] || null;

    let resolvedPersonId = '';
    let resolvedCreatorId = '1';

    // 6. Find or Create person & apply merges/tags
    await this.getRepo()
      .transaction()
      .execute(async (trx: Transaction<Models>) => {
        const tenantRow = await trx
          .selectFrom('tenants')
          .select(['placeholder_household_id'])
          .where('id', '=', tenantId)
          .executeTakeFirst();

        const householdId = tenantRow?.placeholder_household_id;
        // Use the form's creator as the actor — they are the person who
        // configured this form, which is the most correct attribution for
        // contacts and data created via public submissions.
        const creatorId = String(form.createdby_id);

        resolvedCreatorId = creatorId;

        if (!householdId) {
          throw new Error('Tenant placeholder household is not configured.');
        }

        const campaignId = await this.getCampaignId(tenantId, trx);

        // When the tenant requires double opt-in, new subscribers are created as 'pending' and only
        // counted once they confirm via the emailed link (see confirm-subscription route).
        const doubleOptIn = await this.isDoubleOptInEnabled(tenantId, trx);

        let finalHouseholdId = householdId;

        const street1 = (payload['street1'] || payload['street_address'] || '').trim();
        const city = (payload['city'] || '').trim();
        const zip = (payload['zip'] || payload['postal_code'] || '').trim();
        const country = (payload['country'] || payload['residency_country'] || '').trim();
        const state = (payload['state'] || payload['province'] || payload['residency_province'] || '').trim();

        const hasAddress = !!(street1 || city || zip || country || state);

        if (hasAddress) {
          const fp_street = fingerprintStreet({ street1 });
          const fp_full = fingerprintFull({
            street1,
            city,
            state,
            zip,
            country,
          });

          const householdRepo = new HouseholdRepo();
          const existingHh = await trx
            .selectFrom('households')
            .select('id')
            .where('tenant_id', '=', tenantId)
            .where('campaign_id', '=', campaignId)
            .where('address_fp_full', '=', fp_full)
            .executeTakeFirst();

          if (existingHh) {
            finalHouseholdId = String(existingHh.id);
          } else {
            const createdHhs = await householdRepo.addMany(
              {
                rows: [
                  {
                    tenant_id: tenantId,
                    campaign_id: campaignId,
                    createdby_id: creatorId,
                    updatedby_id: creatorId,
                    street1,
                    city,
                    state,
                    zip,
                    country,
                    address_fp_street: fp_street,
                    address_fp_full: fp_full,
                  } as any,
                ],
              },
              trx,
            );
            if (createdHhs && createdHhs[0] && createdHhs[0].id) {
              finalHouseholdId = String(createdHhs[0].id);
            }
          }
        }

        // Check if email already exists
        const existing = await trx
          .selectFrom('persons')
          .select(['id', 'first_name', 'last_name', 'mobile', 'notes'])
          .where('tenant_id', '=', tenantId)
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
          if (form.form_type === 'donation' || hasAddress) {
            updateRow.household_id = finalHouseholdId;
          }
          if (!existing.notes && notes) {
            updateRow.notes = notes;
          } else if (existing.notes && notes) {
            updateRow.notes = `${existing.notes}\n\nSubmission notes: ${notes}`;
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
          const insertRow = {
            tenant_id: tenantId,
            campaign_id: campaignId,
            household_id: finalHouseholdId,
            createdby_id: creatorId,
            updatedby_id: creatorId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            mobile: mobile,
            notes: notes,
            opt_in_status: doubleOptIn ? 'pending' : null,
          };
          const insertRes = await trx.insertInto('persons').values(insertRow).returning('id').executeTakeFirstOrThrow();
          personId = String(insertRes.id);

          // Trigger contact created workflow
          try {
            const workflowsController = new WorkflowsController();
            await workflowsController.triggerWorkflow(tenantId, personId, 'contact_created', null, trx);
          } catch (err) {
            logger.error({ err }, 'Failed to trigger contact_created workflow in WebFormsController');
          }

          // Queue the double opt-in confirmation email (transactional outbox) for brand-new subscribers.
          if (doubleOptIn) {
            await this.enqueueSubscriptionConfirmation(trx, {
              tenantId,
              personId,
              email,
              firstName,
            });
          }
        }

        resolvedPersonId = personId;

        const workflowsController = new WorkflowsController();

        // Add target custom tags & read-only system tag
        const targetTags: string[] = Array.isArray(form.target_tags)
          ? form.target_tags
          : JSON.parse((form.target_tags as any) || '[]');
        const systemTagName = `source: ${form.name}`;
        const allTagsToApply = [...targetTags, systemTagName];
        if (form.form_type === 'donation' || form.form_type === 'recurring_donation') {
          allTagsToApply.push('donor');
        }

        for (const tagName of allTagsToApply) {
          const normalizedTagName = tagName.trim().toLowerCase();
          if (!normalizedTagName) continue;

          let tag = await trx
            .selectFrom('tags')
            .select('id')
            .where('tenant_id', '=', tenantId)
            .where('name', '=', normalizedTagName)
            .where('type', '=', 'tag')
            .executeTakeFirst();

          if (!tag) {
            const insertTagRes = await trx
              .insertInto('tags')
              .values({
                tenant_id: tenantId,
                name: normalizedTagName,
                type: 'tag',
                deletable: true,
                createdby_id: creatorId,
                updatedby_id: creatorId,
              })
              .returning('id')
              .executeTakeFirstOrThrow();
            tag = { id: insertTagRes.id };
          }

          const mapExists = await trx
            .selectFrom('map_peoples_tags')
            .select('person_id')
            .where('tenant_id', '=', tenantId)
            .where('person_id', '=', personId)
            .where('tag_id', '=', tag.id)
            .executeTakeFirst();

          if (!mapExists) {
            await trx
              .insertInto('map_peoples_tags')
              .values({
                tenant_id: tenantId,
                person_id: personId,
                tag_id: tag.id,
                createdby_id: creatorId,
                updatedby_id: creatorId,
              })
              .execute();

            // Trigger tag_added and specialized subscriber workflows
            try {
              await workflowsController.triggerTagAdded(tenantId, personId, String(tag.id), normalizedTagName, trx);
            } catch (err) {
              logger.error({ err }, 'Failed to trigger tag_added workflow in WebFormsController');
            }
          }
        }

        // Add target lists
        const targetLists: string[] = Array.isArray(form.target_lists)
          ? form.target_lists
          : JSON.parse((form.target_lists as any) || '[]');
        for (const listId of targetLists) {
          if (!listId) continue;
          const listExists = await trx
            .selectFrom('lists')
            .select('id')
            .where('tenant_id', '=', tenantId)
            .where('id', '=', listId)
            .executeTakeFirst();

          if (!listExists) continue;

          const inList = await trx
            .selectFrom('map_lists_persons')
            .select('person_id')
            .where('tenant_id', '=', tenantId)
            .where('person_id', '=', personId)
            .where('list_id', '=', listId)
            .executeTakeFirst();

          if (!inList) {
            await trx
              .insertInto('map_lists_persons')
              .values({
                tenant_id: tenantId,
                person_id: personId,
                list_id: listId,
                createdby_id: creatorId,
                updatedby_id: creatorId,
              })
              .execute();

            // Trigger list joined workflows
            try {
              await workflowsController.triggerWorkflow(tenantId, personId, 'list_joined', listId, trx);
            } catch (err) {
              logger.error({ err }, 'Failed to trigger list_joined workflow in WebFormsController');
            }
          }
        }

        // Trigger web form submitted workflows
        try {
          await workflowsController.triggerWorkflow(tenantId, personId, 'web_form_submitted', formId, trx);
        } catch (err) {
          logger.error({ err }, 'Failed to trigger web_form_submitted workflow in WebFormsController');
        }

        // Log user activity
        await trx
          .insertInto('user_activity')
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

        // Queue email notification job in background
        await trx
          .insertInto('background_jobs')
          .values({
            tenant_id: tenantId,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'send-webform-notifications',
              formId: String(form.id),
              tenantId,
              email,
              firstName,
              lastName,
              mobile,
              notes,
            }),
            run_at: new Date(),
          })
          .execute();
      });

    // 7. If donation/recurring form, initialize checkout session after transactional writes commit
    if (form.form_type === 'donation' || form.form_type === 'recurring_donation') {
      const donationsController = new DonationsController();
      const successUrl = `${env.apiUrl.replace(/\/$/, '')}/api/forms/success?checkout_session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${env.apiUrl.replace(/\/$/, '')}/api/forms/view/${formId}?checkout_cancel=true`;

      if (form.form_type === 'donation') {
        const checkoutSession = await donationsController.createCheckoutSession(
          { tenant_id: tenantId, user_id: resolvedCreatorId },
          resolvedPersonId,
          amountCents,
          { country, state },
          { successUrl, cancelUrl },
        );
        return { redirect_url: checkoutSession.url };
      } else {
        const checkoutSession = await donationsController.createRecurringCheckoutSession(
          { tenant_id: tenantId, user_id: resolvedCreatorId },
          resolvedPersonId,
          monthlyAmountCents,
          { country, state },
          { successUrl, cancelUrl },
        );
        return { redirect_url: checkoutSession.url };
      }
    }

    return { redirect_url: form.redirect_url || null };
  }

  /**
   * Confirms a pending double opt-in subscription from a signed link. Public (unauthenticated) — the
   * token carries the tenant and person identity. Idempotent: an already-confirmed person stays confirmed.
   */
  public async confirmSubscription(token: string): Promise<{ success: boolean }> {
    const key = process.env['SHARED_SECRET'] || env.sharedSecret;
    if (!key) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server misconfiguration: SHARED_SECRET is missing.',
      });
    }

    const verifier = createVerifier({ algorithms: ['HS256'], key, ignoreExpiration: false });

    let payload: any;
    try {
      payload = await verifier(token);
    } catch {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This confirmation link is invalid or has expired.' });
    }

    if (!payload || payload.purpose !== 'confirm-subscription' || !payload.tenant_id || !payload.person_id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid confirmation token.' });
    }

    await this.getRepo()
      .db.updateTable('persons')
      .set({ opt_in_status: 'confirmed', opt_in_confirmed_at: sql`now()` })
      .where('tenant_id', '=', String(payload.tenant_id))
      .where('id', '=', String(payload.person_id))
      .execute();

    return { success: true };
  }

  private async isDoubleOptInEnabled(tenantId: string, trx: Transaction<Models>): Promise<boolean> {
    const row = await trx
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'communications.double_opt_in')
      .executeTakeFirst();

    return row?.value === true || row?.value === 'true';
  }

  /**
   * Inserts a transactional-outbox job that emails a new subscriber a signed confirmation link. The job
   * runs only if the surrounding submission transaction commits, keeping the pending person and the
   * confirmation email consistent.
   */
  private async enqueueSubscriptionConfirmation(
    trx: Transaction<Models>,
    args: { tenantId: string; personId: string; email: string; firstName: string | null },
  ): Promise<void> {
    const key = process.env['SHARED_SECRET'] || env.sharedSecret;
    if (!key) {
      logger.error('Cannot send subscription confirmation: SHARED_SECRET is missing.');
      return;
    }

    const signer = createSigner({ algorithm: 'HS256', key, expiresIn: '7d' });
    const token = signer({
      tenant_id: args.tenantId,
      person_id: args.personId,
      email: args.email.toLowerCase().trim(),
      purpose: 'confirm-subscription',
    });
    const confirmUrl = `${env.appUrl}/confirm-subscription?token=${token}`;

    await trx
      .insertInto('background_jobs')
      .values({
        tenant_id: args.tenantId,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'send-subscription-confirmation',
          tenantId: args.tenantId,
          email: args.email,
          firstName: args.firstName,
          confirmUrl,
        }),
        run_at: new Date(),
      })
      .execute();
  }

  private async getCampaignId(tenantId: string, trx: Transaction<Models>): Promise<string> {
    const row = await trx
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId)
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

    const campaignRow = await trx
      .selectFrom('campaigns')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .limit(1)
      .executeTakeFirst();

    if (campaignRow) {
      return String(campaignRow.id);
    }

    throw new Error('No campaign found for this tenant.');
  }

  public async getSubmissionsCount(formId: string, tenantId: string): Promise<number> {
    const res = await this.getRepo()
      .db.selectFrom('user_activity')
      .select(({ fn }) => fn.count('id').as('total'))
      .where('tenant_id', '=', tenantId)
      .where('entity', '=', 'web_forms')
      .where('entity_id', '=', formId)
      .where('activity', '=', 'submission')
      .executeTakeFirst();
    return Number(res?.total ?? 0);
  }
}
