import { StorageService } from '../storage.service';
import { PersonsService } from '../../modules/persons/services/persons.service';
import { DuplicateMaintenanceService } from '../../modules/persons/services/duplicate-maintenance.service';
import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { CompaniesController } from '../../modules/companies/controller';
import { TasksController } from '../../modules/tasks/controller';
import { ListsController } from '../../modules/lists/controller';
import { ActivityController } from '../../modules/activity/controller';
import { GoogleOAuthService } from '../../modules/google-sync/google-oauth.service';
import { GoogleSyncService } from '../../modules/google-sync/google-sync.service';
import { MsOAuthService } from '../../modules/ms-sync/ms-oauth.service';
import { MsSyncService } from '../../modules/ms-sync/ms-sync.service';
import { env } from '../../../env';
import { sql } from 'kysely';
import { TransactionalEmailService } from '../mail/transactional-mail.service';
import { UserActivityRepo } from '../user-activity.repo';
import { NewsletterEmailService } from '../mail/newsletter-mail.service';
import { fingerprintFull, fingerprintStreet } from '../../lib/address-normalize';
import { geocodeAndMapHousehold } from '../gis/geocoding';
import { ExportsRepo } from '../../modules/exports/repositories/exports.repo';
import { rowsToCsv } from '../csv';

const storageService = new StorageService();
const importsRepo = new ImportsRepo();
const mailService = new TransactionalEmailService();

export async function executeJob(payload: any, db: any, jobId?: string): Promise<void> {
  if (payload.type === 'refresh_list') {
    const listsController = new ListsController();
    await listsController.executeListRefresh(payload.tenant_id, payload.list_id, payload.user_id);
  } else if (payload.type === 'enrich_company_google') {
    const { CompaniesEnrichmentService } =
      await import('../../modules/companies/services/companies-enrichment.service');
    const enrichmentSvc = new CompaniesEnrichmentService(db);
    await enrichmentSvc.enrichCompany(payload.company_id, payload.tenant_id);
  } else if (payload.type === 'refresh_companies_google') {
    const { CompaniesEnrichmentService } =
      await import('../../modules/companies/services/companies-enrichment.service');
    const enrichmentSvc = new CompaniesEnrichmentService(db);
    await enrichmentSvc.queueUnenrichedCompanies(payload.tenant_id);

    if (!payload.tenant_id) {
      await db
        .insertInto('background_jobs' as any)
        .values({
          tenant_id: null,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({ type: 'refresh_companies_google' }),
          run_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
          max_attempts: 3,
        })
        .execute();
    }
  } else if (payload.type === 'cleanup_activities') {
    const activityController = new ActivityController();
    await activityController.deleteOldActivities();

    // Schedule next cleanup_activities job 24 hours later
    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'cleanup_activities' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'schedule_sync_jobs') {
    await queueUserSyncJobs(db);

    // Schedule next schedule_sync_jobs job 10 minutes later
    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'schedule_sync_jobs' }),
        run_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes later
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'google_sync') {
    const oauthSvc = new GoogleOAuthService(db, {
      clientId: env.googleClientId ?? '',
      clientSecret: env.googleClientSecret ?? '',
      redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
    });
    const syncSvc = new GoogleSyncService(db, oauthSvc);
    await syncSvc.syncUser(payload.userId, payload.tenantId, payload.requestedBy);
  } else if (payload.type === 'ms_sync') {
    const oauthSvc = new MsOAuthService(db, {
      clientId: env.msClientId ?? '',
      clientSecret: env.msClientSecret ?? '',
      tenantId: env.msTenantId ?? 'common',
      redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
    });
    const syncSvc = new MsSyncService(db, oauthSvc);
    await syncSvc.syncUser(payload.userId, payload.tenantId, payload.requestedBy);
  } else if (payload.type === 'recompute_all_duplicates') {
    const lastJob = await db
      .selectFrom('background_jobs' as any)
      .select(['updated_at'])
      .where('status', '=', 'completed')
      .where(sql`payload->>'type'`, '=', 'recompute_all_duplicates')
      .orderBy('updated_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    const tenants = await db.selectFrom('tenants').select('id').execute();
    const maintenanceSvc = new DuplicateMaintenanceService();
    const lastRunTime = lastJob?.updated_at ? new Date(lastJob.updated_at) : null;

    for (const tenant of tenants) {
      try {
        let shouldRecompute = true;

        if (lastRunTime) {
          const personChanged = await db
            .selectFrom('persons')
            .select('id')
            .where('tenant_id', '=', String(tenant.id))
            .where('updated_at', '>', lastRunTime)
            .limit(1)
            .executeTakeFirst();

          const householdChanged = await db
            .selectFrom('households')
            .select('id')
            .where('tenant_id', '=', String(tenant.id))
            .where('updated_at', '>', lastRunTime)
            .limit(1)
            .executeTakeFirst();

          const companyChanged = await db
            .selectFrom('companies')
            .select('id')
            .where('tenant_id', '=', String(tenant.id))
            .where('updated_at', '>', lastRunTime)
            .limit(1)
            .executeTakeFirst();

          if (!personChanged && !householdChanged && !companyChanged) {
            shouldRecompute = false;
          }
        }

        if (shouldRecompute) {
          await maintenanceSvc.recomputeAllDuplicates(String(tenant.id));
        }
      } catch (tenantErr) {
        console.error(`Failed to recompute duplicates for tenant ${tenant.id}:`, tenantErr);
      }
    }

    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'recompute_all_duplicates' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'send-form-notifications') {
    const event = await db
      .selectFrom('volunteer_events')
      .select([
        'name',
        'start_time',
        'end_time',
        'location_address',
        'contact_email',
        'contact_phone',
        'send_signup_confirmation',
        'send_volunteer_alert',
      ])
      .where('id', '=', payload.eventId as any)
      .executeTakeFirst();

    if (!event) {
      console.log(`Skipping volunteer signup notifications: event ${payload.eventId} not found.`);
      return;
    }

    const startFormatted = new Date(event.start_time).toLocaleString();
    const endFormatted = new Date(event.end_time).toLocaleString();

    // 1. Send Confirmation Email to the Constituent (if enabled)
    if (event.send_signup_confirmation !== false) {
      const coordEmailLine = event.contact_email ? `Email: ${event.contact_email}` : '';
      const coordPhoneLine = event.contact_phone ? `Phone: ${event.contact_phone}` : '';
      const coordinatorDetails = [coordEmailLine, coordPhoneLine].filter(Boolean).join('\n');

      const coordEmailHtml = event.contact_email
        ? `Email: <a href="mailto:${event.contact_email}">${event.contact_email}</a>`
        : '';
      const coordPhoneHtml = event.contact_phone ? `Phone: ${event.contact_phone}` : '';
      const coordinatorDetailsHtml = [coordEmailHtml, coordPhoneHtml].filter(Boolean).join('<br>');

      await mailService.sendMail({
        to: payload.email,
        subject: `Volunteer Signup Confirmation: ${event.name}`,
        text: `Hi ${payload.firstName || 'there'},\n\nThank you for signing up to volunteer for "${event.name}"!\n\nDetails:\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}\n\nEvent Coordinator Details:\n${coordinatorDetails || 'N/A'}\n\nWe look forward to seeing you there!`,
        html: `<p>Hi ${payload.firstName || 'there'},</p><p>Thank you for signing up to volunteer for <strong>"${event.name}"</strong>!</p><p><strong>Details:</strong><br>Date & Time: ${startFormatted} - ${endFormatted}<br>Location: ${event.location_address || 'TBD'}</p><p><strong>Event Coordinator Details:</strong><br>${coordinatorDetailsHtml || 'N/A'}</p><p>We look forward to seeing you there!</p>`,
      });
    }

    // 2. Send Alert Email to the Event Coordinator / Tenant Admin (if enabled)
    if (event.send_volunteer_alert !== false) {
      let alertRecipient = event.contact_email || null;

      if (!alertRecipient) {
        const admin = await db
          .selectFrom('authusers')
          .select('email')
          .where('tenant_id', '=', payload.tenantId as any)
          .limit(1)
          .executeTakeFirst();
        if (admin && admin.email) {
          alertRecipient = admin.email;
        }
      }

      if (alertRecipient) {
        await mailService.sendMail({
          to: alertRecipient,
          subject: `[ALERT] New Volunteer Signup for ${event.name}`,
          text: `Hi,\n\nA new constituent has signed up to volunteer for "${event.name}".\n\nName: ${payload.firstName || ''} ${payload.lastName || ''}\nEmail: ${payload.email}\nPhone: ${payload.mobile || 'N/A'}\nNotes: ${payload.notes || 'None'}`,
          html: `<p>Hi,</p><p>A new constituent has signed up to volunteer for <strong>"${event.name}"</strong>.</p><p><strong>Volunteer Details:</strong><br>Name: ${payload.firstName || ''} ${payload.lastName || ''}<br>Email: ${payload.email}<br>Phone: ${payload.mobile || 'N/A'}<br>Notes: ${payload.notes || 'None'}</p>`,
        });
      }
    }
  } else if (payload.type === 'send-shift-reminder') {
    // Inside the background job processor:
    const shift = await db
      .selectFrom('volunteer_shifts')
      .select(['id', 'status', 'event_id', 'person_id'])
      .where('id', '=', payload.shiftId)
      .executeTakeFirst();

    // Silently abort if the shift was cancelled or the user no-showed
    if (!shift || shift.status === 'cancelled') {
      return;
    }

    // Proceed with sending the email...

    if (!shift) {
      console.log(`Skipping shift reminder: shift ${payload.shiftId} not found.`);
      return;
    }

    if (shift.status !== 'signed_up') {
      console.log(`Skipping shift reminder: shift ${payload.shiftId} status is ${shift.status} instead of signed_up.`);
      return;
    }

    const event = (await db
      .selectFrom('volunteer_events')
      .selectAll()
      .where('id', '=', shift.event_id as any)
      .executeTakeFirst()) as any;

    if (!event) {
      console.log(`Skipping shift reminder: event ${shift.event_id} not found.`);
      return;
    }

    if (event.send_reminder === false) {
      console.log(`Skipping shift reminder: reminders disabled for event ${event.id}.`);
      return;
    }

    const person = (await db
      .selectFrom('persons')
      .selectAll()
      .where('id', '=', shift.person_id as any)
      .executeTakeFirst()) as any;

    if (!person) {
      console.log(`Skipping shift reminder: person ${shift.person_id} not found.`);
      return;
    }

    if (!person.email) {
      console.log(`Skipping shift reminder: person ${shift.person_id} has no email address.`);
      return;
    }

    const startFormatted = new Date(event.start_time).toLocaleString();
    const endFormatted = new Date(event.end_time).toLocaleString();

    const mapsUrl = event.location_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address)}`
      : null;

    const mapsLinkText = mapsUrl ? `\nDirections & Maps: View on Google Maps (${mapsUrl})` : '';

    const subject = `Volunteer Shift Reminder: ${event.name}`;
    const text = `Hi ${person.first_name || 'there'},\n\nThis is a reminder that you have an upcoming volunteer shift for "${event.name}".\n\nDetails:\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}${mapsLinkText}\n\nThank you for volunteering, and we look forward to seeing you there!`;

    const html = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <h2 style="color: #0284c7; margin-top: 0;">Volunteer Shift Reminder</h2>
  <p>Hi ${person.first_name || 'there'},</p>
  <p>This is a reminder that you have an upcoming volunteer shift for <strong>"${event.name}"</strong>.</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 8px;">
    <h3 style="margin: 0 0 8px 0; font-size: 16px;">Shift Details</h3>
    <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${startFormatted} - ${endFormatted}</p>
    <p style="margin: 4px 0;"><strong>Location:</strong> ${event.location_address || 'TBD'}</p>
    ${mapsUrl ? `<p style="margin: 12px 0 4px 0;"><strong>Directions & Map:</strong><br><a href="${mapsUrl}" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Open in Google Maps</a></p>` : ''}
  </div>
  <p>Thank you for volunteering, and we look forward to seeing you there!</p>
</div>`;

    await mailService.sendMail({
      to: person.email,
      subject,
      text,
      html,
    });

    console.log(`Successfully sent shift reminder email to ${person.email} for shift ${shift.id}`);
  } else if (payload.type === 'send-webform-notifications') {
    const form = await db
      .selectFrom('web_forms')
      .select(['name', 'send_confirmation', 'send_alert', 'tenant_id'])
      .where('id', '=', payload.formId as any)
      .executeTakeFirst();

    if (!form) {
      console.log(`Skipping web form notifications: form ${payload.formId} not found.`);
      return;
    }

    // 1. Send Confirmation Email to the Constituent (if enabled)
    if (form.send_confirmation !== false) {
      await mailService.sendMail({
        to: payload.email,
        subject: `Thank you for your submission to ${form.name}`,
        text: `Hi ${payload.firstName || 'there'},\n\nThank you for submitting our form "${form.name}". We have received your request and our team will follow up with you soon.`,
        html: `<p>Hi ${payload.firstName || 'there'},</p><p>Thank you for submitting our form <strong>"${form.name}"</strong>. We have received your request and our team will follow up with you soon.</p>`,
      });
    }

    // 2. Send Alert Email to the Tenant Admin (if enabled)
    if (form.send_alert !== false) {
      const admin = await db
        .selectFrom('authusers')
        .select(['email', 'first_name'])
        .where('tenant_id', '=', form.tenant_id as any)
        .limit(1)
        .executeTakeFirst();

      if (admin && admin.email) {
        await mailService.sendMail({
          to: admin.email,
          subject: `[ALERT] New Lead Submission on ${form.name}`,
          text: `Hi ${admin.first_name || 'Admin'},\n\nYou have received a new submission on form "${form.name}" from ${payload.firstName || ''} ${payload.lastName || ''} (${payload.email}).\n\nNotes:\n${payload.notes || 'None'}`,
          html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>You have received a new submission on form <strong>"${form.name}"</strong> from <strong>${payload.firstName || ''} ${payload.lastName || ''}</strong> (${payload.email}).</p><p><strong>Notes:</strong><br>${payload.notes || 'None'}</p>`,
        });
      }
    }
  } else if (payload.type === 'send-transactional-email') {
    await mailService.sendMail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } else if (payload.import_id && payload.storage_key) {
    // 1. Mark import status as 'processing' in data_imports
    await importsRepo.update({
      tenant_id: payload.tenant_id as any,
      id: payload.import_id as any,
      row: {
        status: 'processing',
        updated_at: new Date(),
      } as any,
    });

    // 2. Download mapping payload from storage
    const buffer = await storageService.download(payload.storage_key);
    const rows = JSON.parse(buffer.toString('utf8'));

    // 3. Process the import rows in chunks
    if (payload.source === 'companies') {
      const companiesController = new CompaniesController();
      await companiesController.processImportRows(
        payload.import_id,
        payload.tenant_id,
        payload.user_id,
        Number(payload.skipped || 0),
        rows,
      );
    } else if (payload.source === 'tasks') {
      const tasksController = new TasksController();
      await tasksController.processImportRows(
        payload.import_id,
        payload.tenant_id,
        payload.user_id,
        Number(payload.skipped || 0),
        rows,
      );
    } else {
      const personsService = new PersonsService();
      await personsService.processImportRows(
        payload.import_id,
        payload.tenant_id,
        payload.user_id,
        payload.campaign_id,
        payload.tags || [],
        Number(payload.skipped || 0),
        rows,
      );
    }

    // 4. Update import status to 'completed'
    await importsRepo.update({
      tenant_id: payload.tenant_id as any,
      id: payload.import_id as any,
      row: {
        status: 'completed',
        processed_at: new Date(),
        updated_at: new Date(),
      } as any,
    });

    try {
      await storageService.delete(payload.storage_key);
    } catch (storageErr) {
      console.error(`Failed to clean up storage key ${payload.storage_key}:`, storageErr);
    }

    try {
      const user = await db
        .selectFrom('authusers')
        .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
        .select(['authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
        .where('authusers.id', '=', Number(payload.user_id) as any)
        .executeTakeFirst();

      if (user && user.email) {
        let optedIn = true;
        if (user.profile_json) {
          try {
            const json = typeof user.profile_json === 'string' ? JSON.parse(user.profile_json) : user.profile_json;
            if (json?.notifications?.import_summary === false) {
              optedIn = false;
            }
          } catch (e) {
            console.error('Failed to parse profile json for import summary check', e);
          }
        }

        if (optedIn) {
          const importRecord = (await importsRepo.getOneBy('id', {
            tenant_id: payload.tenant_id,
            value: payload.import_id,
          })) as any;

          if (importRecord) {
            const inserted = importRecord.inserted_count || 0;
            const errors = importRecord.error_count || 0;
            const skipped = importRecord.skipped_count || 0;

            const mailService = new TransactionalEmailService();
            await mailService.sendMail({
              to: user.email,
              subject: `Spreadsheet Import Complete: ${payload.file_name || 'import.csv'}`,
              text: `Hi ${user.first_name || 'there'},\n\nYour contact spreadsheet import has completed.\n\nStatistics:\n- Inserted: ${inserted}\n- Errors: ${errors}\n- Skipped: ${skipped}\n\nView imported rows: http://localhost:4200/imports/${payload.import_id}`,
              html: `<p>Hi ${user.first_name || 'there'},</p><p>Your contact spreadsheet import has completed.</p><p><strong>Import Statistics:</strong><br>• Inserted: <strong>${inserted}</strong><br>• Errors: <strong>${errors}</strong><br>• Skipped: <strong>${skipped}</strong></p><p><a href="http://localhost:4200/imports/${payload.import_id}">View Imported Rows</a></p>`,
            });
          }
        }
      }
    } catch (mailErr) {
      console.error('Failed to send import completion summary email', mailErr);
    }
  } else if (payload.type === 'check_due_tasks') {
    await checkDueTasks(db);

    // Schedule next check_due_tasks job 24 hours later
    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'check_due_tasks' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'send-newsletter') {
    const newsletterMailSvc = new NewsletterEmailService();
    const recipients = payload.recipients || [];
    const totalRecipients = recipients.length;
    const batchSize = 500;

    let offset = payload.offset || 0;
    let deliveredCount = payload.deliveredCount || 0;

    if (offset === 0) {
      await db
        .updateTable('newsletters')
        .set({
          status: 'sending',
          total_recipients: totalRecipients,
          updated_at: new Date(),
        })
        .where('tenant_id', '=', payload.tenantId)
        .where('id', '=', payload.newsletterId)
        .execute();
    }

    while (offset < totalRecipients) {
      const chunk = recipients.slice(offset, offset + batchSize);

      const batchDelivered = await newsletterMailSvc.sendNewsletter({
        fromName: payload.fromName,
        fromEmail: payload.fromEmail,
        recipients: chunk,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        sendgridApiKey: payload.sendgridApiKey,
        subuserUsername: payload.subuserUsername,
        newsletterId: payload.newsletterId,
        tenantId: payload.tenantId,
      });

      deliveredCount += batchDelivered;
      offset += chunk.length;

      // Update progress in the background job payload
      if (jobId) {
        await db
          .updateTable('background_jobs')
          .set({
            payload: JSON.stringify({
              ...payload,
              offset,
              deliveredCount,
            }),
            updated_at: new Date(),
          })
          .where('id', '=', jobId)
          .execute();
      }

      // Add a small delay between batches to respect rate limits
      if (offset < totalRecipients) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update newsletter status to 'sent'
    await db
      .updateTable('newsletters')
      .set({
        status: 'sent',
        delivered_count: deliveredCount,
        send_date: new Date(),
        updatedby_id: payload.userId,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', payload.tenantId)
      .where('id', '=', payload.newsletterId)
      .execute();

    // Log user activity
    const userActivity = new UserActivityRepo();
    await userActivity.log({
      tenant_id: payload.tenantId,
      user_id: payload.userId,
      activity: 'send',
      entity: 'newsletters',
      entity_id: payload.newsletterId,
      quantity: totalRecipients,
      metadata: { recipientsCount: totalRecipients, deliveredCount },
    });

    const { queueUsageLimitCheck } = await import('../../modules/billing/usage-limits');
    await queueUsageLimitCheck(payload.tenantId, db);
  } else if (payload.type === 'send-newsletter-batch') {
    const newsletterMailSvc = new NewsletterEmailService();
    const recipients = payload.recipients || [];

    const deliveredCount = await newsletterMailSvc.sendNewsletter({
      fromName: payload.fromName,
      fromEmail: payload.fromEmail,
      recipients,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      sendgridApiKey: payload.sendgridApiKey,
      subuserUsername: payload.subuserUsername,
      newsletterId: payload.newsletterId,
      tenantId: payload.tenantId,
    });

    const newsletterId = String(payload.newsletterId);
    const tenantId = String(payload.tenantId);
    const userId = String(payload.userId);

    await db.transaction().execute(async (trx: any) => {
      const newsletter = await trx
        .selectFrom('newsletters')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', newsletterId)
        .forUpdate()
        .executeTakeFirst();

      if (!newsletter) {
        console.warn(`Newsletter ${newsletterId} not found during batch completion.`);
        return;
      }

      const newDelivered = Number(newsletter.delivered_count || 0) + deliveredCount;
      const nextStatus = newsletter.status === 'queuing' ? 'sending' : newsletter.status;

      const remainingJobs = await trx
        .selectFrom('background_jobs' as any)
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'send-newsletter-batch')
        .where(sql`payload->>'newsletterId'`, '=', newsletterId)
        .where('id', '!=', jobId as any)
        .execute();

      if (remainingJobs.length === 0) {
        await trx
          .updateTable('newsletters')
          .set({
            status: 'sent',
            delivered_count: newDelivered,
            send_date: new Date(),
            updatedby_id: userId,
            updated_at: new Date(),
          })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', newsletterId)
          .execute();

        await trx
          .insertInto('user_activity')
          .values({
            tenant_id: tenantId,
            user_id: userId,
            activity: 'send',
            entity: 'newsletters',
            entity_id: newsletterId,
            quantity: newsletter.total_recipients || newDelivered,
            metadata: JSON.stringify({
              recipientsCount: newsletter.total_recipients || newDelivered,
              deliveredCount: newDelivered,
            }),
            createdby_id: userId,
            updatedby_id: userId,
          })
          .execute();

        const { queueUsageLimitCheck } = await import('../../modules/billing/usage-limits');
        await queueUsageLimitCheck(tenantId, trx);
      } else {
        await trx
          .updateTable('newsletters')
          .set({
            status: nextStatus,
            delivered_count: newDelivered,
            updated_at: new Date(),
          })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', newsletterId)
          .execute();
      }
    });
  } else if (payload.type === 'recompute_address_fingerprints') {
    const tenantIds: string[] = [];
    if (payload.tenant_id) {
      tenantIds.push(String(payload.tenant_id));
    } else {
      const tenants = await db.selectFrom('tenants').select('id').execute();
      for (const tenant of tenants) {
        tenantIds.push(String(tenant.id));
      }
    }

    for (const tenantId of tenantIds) {
      try {
        await recomputeTenantAddressFingerprints(tenantId, db);
      } catch (tenantErr) {
        console.error(`Failed to recompute address fingerprints for tenant ${tenantId}:`, tenantErr);
      }
    }

    // Schedule next run 24 hours later if periodic/cron-like (no tenant_id)
    if (!payload.tenant_id) {
      await db
        .insertInto('background_jobs' as any)
        .values({
          tenant_id: null,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({ type: 'recompute_address_fingerprints' }),
          run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          max_attempts: 3,
        })
        .execute();
    }
  } else if (payload.type === 'geocode_household') {
    await geocodeAndMapHousehold(payload.household_id, payload.tenant_id, db);
  } else if (payload.type === 'process_drip_workflows') {
    const now = new Date();
    const pendingEnrollments = await db
      .selectFrom('workflow_enrollments')
      .selectAll()
      .where('status', '=', 'active')
      .where('next_run_at', '<=', now)
      .execute();

    for (const enrollment of pendingEnrollments) {
      try {
        await db.transaction().execute(async (trx: any) => {
          const lockedEnrollment = await trx
            .selectFrom('workflow_enrollments')
            .selectAll()
            .where('id', '=', enrollment.id)
            .where('status', '=', 'active')
            .where('next_run_at', '<=', now)
            .forUpdate()
            .skipLocked()
            .executeTakeFirst();

          if (!lockedEnrollment) return;

          const step = await trx
            .selectFrom('workflow_steps')
            .selectAll()
            .where('workflow_id', '=', lockedEnrollment.workflow_id)
            .where('step_number', '=', lockedEnrollment.current_step_number)
            .executeTakeFirst();

          if (!step) {
            await trx
              .updateTable('workflow_enrollments')
              .set({
                status: 'completed',
                next_run_at: null,
                updated_at: new Date(),
              })
              .where('id', '=', lockedEnrollment.id)
              .execute();
            return;
          }

          const person = await trx
            .selectFrom('persons')
            .select(['id', 'email', 'first_name', 'last_name'])
            .where('id', '=', lockedEnrollment.person_id)
            .executeTakeFirst();

          if (person && person.email) {
            const textContent =
              step.plain_text_content || `Hello ${person.first_name || 'there'},\n\nThis is an automated message.`;
            const htmlContent =
              step.html_content || `<p>Hello ${person.first_name || 'there'},</p><p>This is an automated message.</p>`;

            await trx
              .insertInto('background_jobs' as any)
              .values({
                tenant_id: lockedEnrollment.tenant_id as any,
                queue: 'default',
                status: 'pending',
                payload: JSON.stringify({
                  type: 'send-transactional-email',
                  to: person.email,
                  subject: step.subject,
                  text: textContent,
                  html: htmlContent,
                }),
                run_at: new Date(),
                max_attempts: 5,
              })
              .execute();

            const workflow = await trx
              .selectFrom('workflows')
              .select(['name', 'createdby_id'])
              .where('id', '=', lockedEnrollment.workflow_id)
              .executeTakeFirst();

            const actorId = workflow?.createdby_id || '1';

            await trx
              .insertInto('user_activity')
              .values({
                tenant_id: lockedEnrollment.tenant_id,
                user_id: actorId,
                activity: 'send',
                entity: 'workflows',
                entity_id: String(lockedEnrollment.workflow_id),
                quantity: 1,
                metadata: JSON.stringify({
                  person_id: String(person.id),
                  person_name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
                  email: person.email,
                  subject: step.subject,
                  step_number: step.step_number,
                }),
                createdby_id: actorId,
                updatedby_id: actorId,
              })
              .execute();
          }

          const nextStep = await trx
            .selectFrom('workflow_steps')
            .selectAll()
            .where('workflow_id', '=', lockedEnrollment.workflow_id)
            .where('step_number', '>', lockedEnrollment.current_step_number)
            .orderBy('step_number', 'asc')
            .limit(1)
            .executeTakeFirst();

          if (nextStep) {
            const delayMs =
              nextStep.delay_unit === 'hours'
                ? nextStep.delay_days * 60 * 60 * 1000
                : nextStep.delay_days * 24 * 60 * 60 * 1000;
            const nextRunAt = new Date(Date.now() + delayMs);
            await trx
              .updateTable('workflow_enrollments')
              .set({
                current_step_number: nextStep.step_number,
                next_run_at: nextRunAt,
                updated_at: new Date(),
              })
              .where('id', '=', lockedEnrollment.id)
              .execute();
          } else {
            await trx
              .updateTable('workflow_enrollments')
              .set({
                status: 'completed',
                next_run_at: null,
                updated_at: new Date(),
              })
              .where('id', '=', lockedEnrollment.id)
              .execute();
          }
        });
      } catch (err) {
        console.error(`Failed to process drip workflow enrollment ${enrollment.id}:`, err);
      }
    }

    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'process_drip_workflows' }),
        run_at: new Date(Date.now() + 10 * 60 * 1000),
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'perform_scheduled_deletions') {
    const now = new Date();

    const expiredUsers = await db
      .selectFrom('authusers')
      .select('id')
      .where('deletion_scheduled_at', '<=', now)
      .execute();

    for (const user of expiredUsers) {
      const userId = String(user.id);
      await db.transaction().execute(async (trx: any) => {
        await trx
          .deleteFrom('sessions')
          .where('user_id', '=', BigInt(userId) as any)
          .execute();
        await trx
          .deleteFrom('profiles')
          .where('auth_id', '=', BigInt(userId) as any)
          .execute();
        await trx
          .deleteFrom('authusers')
          .where('id', '=', BigInt(userId) as any)
          .execute();
      });
    }

    const expiredTenants = await db
      .selectFrom('tenants')
      .select('id')
      .where('deletion_scheduled_at', '<=', now)
      .execute();

    for (const tenant of expiredTenants) {
      const tenantId = String(tenant.id);
      console.log(`Hard-deleting tenant ${tenantId} (deletion_scheduled_at <= now)…`);
      await db.transaction().execute(async (trx: any) => {
        const tid = BigInt(tenantId) as any;

        // ── Collaboration ─────────────────────────────────────────────────
        await trx.deleteFrom('task_attachments').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('task_comments').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('task_subtasks').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('tasks').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('map_teams_lists').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('map_teams_persons').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('teams').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('map_lists_persons').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('map_lists_households').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('lists').where('tenant_id', '=', tid).execute();

        // ── Email & Marketing ──────────────────────────────────────────────
        await trx.deleteFrom('workflow_enrollments').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('workflow_steps').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('workflows').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('newsletter_events').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('newsletters').where('tenant_id', '=', tid).execute();

        // ── Ops & Platform ─────────────────────────────────────────────────
        await trx.deleteFrom('notifications').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('user_activity').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('potential_duplicates').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('data_imports').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('data_exports').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('web_forms').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('background_jobs').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('webhook_events').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('volunteer_shifts').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('volunteer_events').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('files').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('ms_oauth_tokens').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('google_oauth_tokens').where('tenant_id', '=', tid).execute();

        // ── Email inbox ────────────────────────────────────────────────────
        await trx.deleteFrom('email_read_states').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('email_comments').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('email_trash').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('email_drafts').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('emails').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('email_folders').where('tenant_id', '=', tid).execute();

        // ── CRM Core ───────────────────────────────────────────────────────
        await trx.deleteFrom('map_campaigns_users').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('map_peoples_tags').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('map_households_tags').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('companies').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('persons').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('households').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('campaigns').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('tags').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('settings').where('tenant_id', '=', tid).execute();

        // ── Auth & Identity (last) ─────────────────────────────────────────
        await trx.deleteFrom('sessions').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('profiles').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('authusers').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('tenants').where('id', '=', tid).execute();

        console.log(`Tenant ${tenantId} fully hard-deleted.`);
      });
    }

    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'perform_scheduled_deletions' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'check_usage_limits') {
    const { checkTenantUsage } = await import('../../modules/billing/usage-limits');
    await checkTenantUsage(payload.tenant_id, db);
  } else if (payload.type === 'check_all_usage_limits') {
    const { checkAllUsageLimits } = await import('../../modules/billing/usage-limits');
    await checkAllUsageLimits(db);
    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'check_all_usage_limits' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'export_csv') {
    const exportsRepo = new ExportsRepo();
    const exportId = String(payload.export_id);
    const tenantId = String(payload.tenant_id);
    try {
      // Mark as processing
      await exportsRepo.updateStatus(exportId, tenantId, 'processing');

      // Fetch all rows for the entity
      const table = String(payload.table || payload.entity);
      let query = db
        .selectFrom(table as any)
        .selectAll()
        .where('tenant_id', '=', tenantId as any);

      // Issues are tags with type='issue'
      if (payload.entity === 'issues') {
        query = query.where('type', '=', 'issue') as any;
      }

      // Apply search string if provided
      const opts = payload.options ?? {};
      if (opts.searchStr) {
        const like = `%${opts.searchStr}%`;
        // Best-effort: try name, first_name/last_name depending on table
        if (table === 'persons') {
          query = query.where((eb: any) =>
            eb.or([eb('first_name', 'ilike', like), eb('last_name', 'ilike', like), eb('email', 'ilike', like)]),
          ) as any;
        } else if (table === 'households') {
          query = query.where((eb: any) => eb.or([eb('street1', 'ilike', like), eb('city', 'ilike', like)])) as any;
        } else {
          query = query.where('name' as any, 'ilike', like) as any;
        }
      }

      // Apply sort
      if (opts.sortModel?.length) {
        for (const s of opts.sortModel) {
          if (s?.colId) {
            query = query.orderBy(s.colId as any, s.sort === 'desc' ? 'desc' : 'asc') as any;
          }
        }
      } else {
        query = query.orderBy('created_at' as any, 'desc') as any;
      }

      const rows = await query.execute();
      const records = rows.map((r: any) => ({ ...(r as Record<string, unknown>) }));

      // Determine columns
      const requestedCols: string[] =
        Array.isArray(payload.columns) && payload.columns.length
          ? payload.columns
          : records.length > 0
            ? Object.keys(records[0])
            : [];

      const csv = requestedCols.length ? rowsToCsv(records, requestedCols) : '';
      const storageKey = `exports/${tenantId}/${exportId}.csv`;

      if (csv) {
        await storageService.upload(storageKey, Buffer.from(csv, 'utf8'), 'text/csv');
      }

      await exportsRepo.updateStatus(exportId, tenantId, 'completed', {
        rowCount: records.length,
        storageKey: csv ? storageKey : undefined,
      });

      console.log(`Export job ${exportId} completed: ${records.length} rows exported.`);
    } catch (err: any) {
      console.error(`Export job ${exportId} failed:`, err);
      await exportsRepo.updateStatus(exportId, tenantId, 'failed', {
        error: (err?.message || String(err)).substring(0, 500),
      });
      throw err;
    }
  } else {
    throw new Error(`Unsupported background job type: ${payload.type}`);
  }
}

async function recomputeTenantAddressFingerprints(tenantId: string, db: any): Promise<void> {
  const households = await db.selectFrom('households').selectAll().where('tenant_id', '=', tenantId).execute();

  for (const hh of households) {
    const fp_street = fingerprintStreet({
      street_num: hh.street_num,
      street1: hh.street1,
      street2: hh.street2,
    });
    const fp_full = fingerprintFull({
      apt: hh.apt,
      street_num: hh.street_num,
      street1: hh.street1,
      street2: hh.street2,
      city: hh.city,
      state: hh.state,
      zip: hh.zip,
      country: hh.country,
    });

    if (hh.address_fp_street !== fp_street || hh.address_fp_full !== fp_full) {
      await db
        .updateTable('households')
        .set({
          address_fp_street: fp_street,
          address_fp_full: fp_full,
          updated_at: new Date(),
        })
        .where('id', '=', hh.id)
        .where('tenant_id', '=', tenantId)
        .execute();
    }
  }

  const maintenanceSvc = new DuplicateMaintenanceService();
  await maintenanceSvc.recomputeAllDuplicates(tenantId);
}

async function queueUserSyncJobs(db: any): Promise<void> {
  try {
    // Find all connected Google accounts
    const googleTokens = await db.selectFrom('google_oauth_tokens').select(['user_id', 'tenant_id']).execute();

    for (const token of googleTokens) {
      const userId = String(token.user_id);
      const tenantId = token.tenant_id ? String(token.tenant_id) : null;

      // Check if there is already a pending or processing sync job for this user
      const existing = await db
        .selectFrom('background_jobs' as any)
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'google_sync')
        .where(sql`payload->>'userId'`, '=', userId)
        .executeTakeFirst();

      if (!existing) {
        console.log(`Auto-scheduling Google sync job for user ${userId}`);
        await db
          .insertInto('background_jobs' as any)
          .values({
            tenant_id: tenantId as any,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'google_sync',
              userId,
              tenantId,
              requestedBy: 'system',
            }),
            run_at: new Date(),
            max_attempts: 3,
          })
          .execute();
      }
    }

    // Find all connected Microsoft accounts
    const msTokens = await db.selectFrom('ms_oauth_tokens').select(['user_id', 'tenant_id']).execute();

    for (const token of msTokens) {
      const userId = String(token.user_id);
      const tenantId = token.tenant_id ? String(token.tenant_id) : null;

      // Check if there is already a pending or processing sync job for this user
      const existing = await db
        .selectFrom('background_jobs' as any)
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'ms_sync')
        .where(sql`payload->>'userId'`, '=', userId)
        .executeTakeFirst();

      if (!existing) {
        console.log(`Auto-scheduling MS sync job for user ${userId}`);
        await db
          .insertInto('background_jobs' as any)
          .values({
            tenant_id: tenantId as any,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'ms_sync',
              userId,
              tenantId,
              requestedBy: 'system',
            }),
            run_at: new Date(),
            max_attempts: 3,
          })
          .execute();
      }
    }
  } catch (err) {
    console.error('Failed to queue user sync jobs:', err);
  }
}

export async function checkDueTasks(db: any): Promise<void> {
  const now = new Date();
  try {
    const dueTasks = await db
      .selectFrom('tasks')
      .innerJoin('authusers', 'authusers.id', 'tasks.assigned_to')
      .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
      .select([
        'tasks.id as task_id',
        'tasks.name as task_name',
        'tasks.due_at',
        'tasks.details',
        'authusers.id as user_id',
        'authusers.email as user_email',
        'authusers.first_name',
        'profiles.json as profile_json',
      ])
      .where('tasks.status', 'not in', ['done', 'canceled', 'archived'])
      .where('tasks.due_at', '<=', now)
      .orderBy('tasks.due_at', 'asc')
      .execute();

    if (dueTasks.length === 0) return;

    const userTasksMap = new Map<string, any[]>();
    for (const row of dueTasks) {
      const userId = String(row.user_id);
      if (!userTasksMap.has(userId)) {
        userTasksMap.set(userId, []);
      }
      userTasksMap.get(userId)!.push(row);
    }

    const mailService = new TransactionalEmailService();

    for (const [, tasks] of userTasksMap.entries()) {
      const firstRow = tasks[0];
      const userEmail = firstRow.user_email;
      const firstName = firstRow.first_name;
      const profileJson = firstRow.profile_json;

      let optedIn = true;
      if (profileJson) {
        try {
          const json = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
          if (json?.notifications?.task_due === false) {
            optedIn = false;
          }
        } catch (e) {
          console.error('Failed to parse profile json in checkDueTasks', e);
        }
      }

      if (optedIn && userEmail) {
        let textContent = `Hi ${firstName || 'there'},\n\nHere are your active tasks needing attention today:\n\n`;
        let htmlContent = `<p>Hi ${firstName || 'there'},</p><p>Here are your active tasks needing attention today:</p><ul>`;

        for (const t of tasks) {
          const dueDateStr = t.due_at ? new Date(t.due_at).toLocaleDateString() : 'No due date';
          textContent += `- ${t.task_name} (Due: ${dueDateStr})\n  Link: http://localhost:4200/tasks/${t.task_id}\n\n`;
          htmlContent += `<li><strong>${t.task_name}</strong> (Due: ${dueDateStr}) - <a href="http://localhost:4200/tasks/${t.task_id}">Resolve</a></li>`;
        }

        htmlContent += `</ul>`;

        await mailService.sendMail({
          to: userEmail,
          subject: `Daily Task Attention Needed: ${tasks.length} Task(s) Due or Overdue`,
          text: textContent,
          html: htmlContent,
        });
      }
    }
  } catch (err) {
    console.error('Failed to check and notify due tasks:', err);
  }
}
