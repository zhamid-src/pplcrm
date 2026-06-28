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
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { TransactionalEmailService } from '../mail/transactional-mail.service';
import { UserActivityRepo } from '../user-activity.repo';
import { NewsletterEmailService } from '../mail/newsletter-mail.service';
import { fingerprintFull, fingerprintStreet } from '../../lib/address-normalize';
import { geocodeAndMapHousehold } from '../gis/geocoding';
import { ExportsRepo } from '../../modules/exports/repositories/exports.repo';
import { Readable } from 'stream';
import { CsvTransformStream } from '../csv-stream';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';

const storageService = new StorageService();
const importsRepo = new ImportsRepo();
const mailService = new TransactionalEmailService();

export async function executeJob(payload: any, db: Kysely<Models>, jobId?: string): Promise<void> {
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
        .insertInto('background_jobs')
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
      .insertInto('background_jobs')
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
      .insertInto('background_jobs')
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
    await syncSvc.syncTenant(payload.tenantId, payload.requestedBy);
  } else if (payload.type === 'ms_sync') {
    const oauthSvc = new MsOAuthService(db, {
      clientId: env.msClientId ?? '',
      clientSecret: env.msClientSecret ?? '',
      tenantId: env.msTenantId ?? 'common',
      redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
    });
    const syncSvc = new MsSyncService(db, oauthSvc);
    await syncSvc.syncTenant(payload.tenantId, payload.requestedBy);
  } else if (payload.type === 'recompute_all_duplicates') {
    const lastJob = await db
      .selectFrom('background_jobs')
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
      .insertInto('background_jobs')
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
      .where('id', '=', payload.eventId)
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
          .where('tenant_id', '=', payload.tenantId)
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

    const event = await db
      .selectFrom('volunteer_events')
      .selectAll()
      .where('id', '=', shift.event_id)
      .executeTakeFirst();

    if (!event) {
      console.log(`Skipping shift reminder: event ${shift.event_id} not found.`);
      return;
    }

    if (event.send_reminder === false) {
      console.log(`Skipping shift reminder: reminders disabled for event ${event.id}.`);
      return;
    }

    const person = await db.selectFrom('persons').selectAll().where('id', '=', shift.person_id).executeTakeFirst();

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
      .where('id', '=', payload.formId)
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
        .where('tenant_id', '=', form.tenant_id)
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
  } else if (payload.type === 'send-event-registration-confirmation') {
    const registration = await db
      .selectFrom('event_registrations')
      .select(['id', 'status', 'event_id', 'person_id', 'ticket_type_id'])
      .where('id', '=', payload.registrationId)
      .executeTakeFirst();

    if (!registration || registration.status === 'cancelled') {
      console.log(`Skipping event confirmation: registration ${payload.registrationId} not found or cancelled.`);
      return;
    }

    const event = await db
      .selectFrom('events')
      .select([
        'name',
        'start_time',
        'end_time',
        'location_address',
        'contact_email',
        'contact_phone',
        'send_registration_confirmation',
      ])
      .where('id', '=', registration.event_id)
      .executeTakeFirst();

    if (!event || event.send_registration_confirmation === false) {
      console.log(`Skipping event confirmation: event ${registration.event_id} not found or confirmations disabled.`);
      return;
    }

    const person = await db
      .selectFrom('persons')
      .select(['first_name', 'email'])
      .where('id', '=', registration.person_id)
      .executeTakeFirst();

    if (!person || !person.email) {
      console.log(`Skipping event confirmation: person ${registration.person_id} has no email.`);
      return;
    }

    const startFormatted = new Date(event.start_time).toLocaleString();
    const endFormatted = new Date(event.end_time).toLocaleString();
    const coordLine = [
      event.contact_email ? `Email: ${event.contact_email}` : '',
      event.contact_phone ? `Phone: ${event.contact_phone}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const coordHtml = [
      event.contact_email ? `Email: <a href="mailto:${event.contact_email}">${event.contact_email}</a>` : '',
      event.contact_phone ? `Phone: ${event.contact_phone}` : '',
    ]
      .filter(Boolean)
      .join('<br>');

    await mailService.sendMail({
      to: person.email,
      subject: `Registration Confirmed: ${event.name}`,
      text: `Hi ${person.first_name || 'there'},\n\nYou're registered for "${event.name}"!\n\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}${coordLine ? `\n\nContact:\n${coordLine}` : ''}\n\nWe look forward to seeing you there!`,
      html: `<p>Hi ${person.first_name || 'there'},</p><p>You're registered for <strong>"${event.name}"</strong>!</p><div style="background:#f8fafc;border-left:4px solid #0284c7;padding:16px;margin:20px 0;border-radius:8px;"><p style="margin:4px 0"><strong>Date & Time:</strong> ${startFormatted} - ${endFormatted}</p><p style="margin:4px 0"><strong>Location:</strong> ${event.location_address || 'TBD'}</p>${coordHtml ? `<p style="margin:12px 0 4px 0"><strong>Contact:</strong><br>${coordHtml}</p>` : ''}</div><p>We look forward to seeing you there!</p>`,
    });

    console.log(`Sent registration confirmation to ${person.email} for event ${registration.event_id}`);
  } else if (payload.type === 'send-event-reminder') {
    const registration = await db
      .selectFrom('event_registrations')
      .select(['id', 'status', 'event_id', 'person_id'])
      .where('id', '=', payload.registrationId)
      .executeTakeFirst();

    if (!registration || registration.status !== 'registered') {
      console.log(
        `Skipping event reminder: registration ${payload.registrationId} not found or not in registered status.`,
      );
      return;
    }

    const event = await db.selectFrom('events').selectAll().where('id', '=', registration.event_id).executeTakeFirst();

    if (!event || event.send_reminder === false) {
      console.log(`Skipping event reminder: event ${registration.event_id} not found or reminders disabled.`);
      return;
    }

    const person = await db
      .selectFrom('persons')
      .select(['first_name', 'email'])
      .where('id', '=', registration.person_id)
      .executeTakeFirst();

    if (!person || !person.email) {
      console.log(`Skipping event reminder: person ${registration.person_id} has no email.`);
      return;
    }

    const startFormatted = new Date(event.start_time).toLocaleString();
    const endFormatted = new Date(event.end_time).toLocaleString();
    const mapsUrl = event.location_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address)}`
      : null;

    await mailService.sendMail({
      to: person.email,
      subject: `Reminder: ${event.name} is tomorrow`,
      text: `Hi ${person.first_name || 'there'},\n\nThis is a reminder that you're registered for "${event.name}" tomorrow.\n\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}${mapsUrl ? `\nDirections: ${mapsUrl}` : ''}\n\nWe look forward to seeing you there!`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:24px;"><h2 style="color:#0284c7;margin-top:0;">Event Reminder</h2><p>Hi ${person.first_name || 'there'},</p><p>This is a reminder that you're registered for <strong>"${event.name}"</strong> tomorrow.</p><div style="background:#f8fafc;border-left:4px solid #0284c7;padding:16px;margin:20px 0;border-radius:8px;"><p style="margin:4px 0"><strong>Date & Time:</strong> ${startFormatted} - ${endFormatted}</p><p style="margin:4px 0"><strong>Location:</strong> ${event.location_address || 'TBD'}</p>${mapsUrl ? `<p style="margin:12px 0 4px 0"><a href="${mapsUrl}" target="_blank" style="color:#0284c7;font-weight:600;">Open in Google Maps</a></p>` : ''}</div><p>We look forward to seeing you there!</p></div>`,
    });

    console.log(`Sent event reminder to ${person.email} for event ${registration.event_id}`);
  } else if (payload.type === 'send-transactional-email') {
    await mailService.sendMail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } else if (payload.type === 'send-subscription-confirmation') {
    await mailService.sendMail({
      to: payload.email,
      subject: 'Please confirm your subscription',
      text: `Hi ${payload.firstName || 'there'},\n\nPlease confirm your subscription by visiting the link below:\n\n${payload.confirmUrl}\n\nIf you did not request this, you can safely ignore this email.`,
      html: `<p>Hi ${payload.firstName || 'there'},</p><p>Please confirm your subscription by clicking the button below.</p><p><a href="${payload.confirmUrl}" class="btn">Confirm subscription</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
    });
  } else if (payload.import_id && payload.storage_key) {
    // 1. Mark import status as 'processing' in data_imports
    await importsRepo.update({
      tenant_id: payload.tenant_id,
      id: payload.import_id,
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
      tenant_id: payload.tenant_id,
      id: payload.import_id,
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
        .where('authusers.id', '=', payload.user_id)
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
              text: `Hi ${user.first_name || 'there'},\n\nYour contact spreadsheet import has completed.\n\nStatistics:\n- Inserted: ${inserted}\n- Errors: ${errors}\n- Skipped: ${skipped}\n\nView imported rows: ${env.appUrl}/imports/${payload.import_id}`,
              html: `<p>Hi ${user.first_name || 'there'},</p><p>Your contact spreadsheet import has completed.</p><p><strong>Import Statistics:</strong><br>• Inserted: <strong>${inserted}</strong><br>• Errors: <strong>${errors}</strong><br>• Skipped: <strong>${skipped}</strong></p><p><a href="${env.appUrl}/imports/${payload.import_id}">View Imported Rows</a></p>`,
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
      .insertInto('background_jobs')
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
    const tenantId = String(payload.tenantId);
    const newsletterId = String(payload.newsletterId);
    const userId = String(payload.userId);

    // 1. Fetch newsletter to get settings, targets, segments, and content
    const newsletter = await db
      .selectFrom('newsletters')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', newsletterId)
      .executeTakeFirst();

    if (!newsletter) {
      console.warn(`Newsletter ${newsletterId} not found.`);
      return;
    }

    // 2. Build the recipient query using NewslettersController
    const { NewslettersController } = await import('../../modules/newsletters/controller');
    const controller = new NewslettersController();
    const baseQuery = controller.buildRecipientQuery(tenantId, newsletter);

    // 3. Count total recipients
    let offset = payload.offset || 0;
    let deliveredCount = payload.deliveredCount || 0;

    const countResult = await baseQuery
      .select(({ fn }: any) => fn.count(sql`DISTINCT persons.email`).as('count'))
      .executeTakeFirst();
    const totalRecipients = Number((countResult as any)?.count || 0);

    if (offset === 0) {
      await db
        .updateTable('newsletters')
        .set({
          status: 'sending',
          total_recipients: totalRecipients,
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', newsletterId)
        .execute();
    }

    // Load communications/settings from database
    const settingsRows = await db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenantId)
      .where('key', 'in', [
        'communications.sendgrid_api_key',
        'communications.sendgrid_subuser_username',
        'communications.default_from_name',
        'communications.default_from_email',
        'communications.reply_to',
        'communications.footer_disclaimer',
        'communications.verified_emails',
        'organization.address',
      ])
      .execute();

    const settingsMap: Record<string, string> = {};
    let verifiedEmails: string[] = [];
    for (const row of settingsRows) {
      if (typeof row.value === 'string') {
        settingsMap[row.key] = row.value;
      } else if (row.key === 'communications.verified_emails' && Array.isArray(row.value)) {
        verifiedEmails = (row.value as unknown[]).map((e) => String(e).toLowerCase().trim());
      }
    }

    const sendgridApiKey = settingsMap['communications.sendgrid_api_key'];
    const subuserUsername = settingsMap['communications.sendgrid_subuser_username'];
    const fromName = settingsMap['communications.default_from_name'] || 'PeopleCRM Team';
    const fromEmail = settingsMap['communications.default_from_email'] || 'pplcrm@campaignraven.com';

    // Reply-to is only honored when it has been verified (mirrors settings save-time validation).
    const replyToRaw = (settingsMap['communications.reply_to'] || '').toLowerCase().trim();
    const replyTo = replyToRaw && verifiedEmails.includes(replyToRaw) ? replyToRaw : undefined;

    // Mandatory footer appended server-side so it cannot be removed from the editor: org address,
    // tenant disclaimer, and a SendGrid-substituted unsubscribe link.
    const footer = buildNewsletterFooter(
      settingsMap['organization.address'],
      settingsMap['communications.footer_disclaimer'],
    );

    const batchSize = 500;

    while (offset < totalRecipients) {
      // Query a chunk of recipients dynamically using LIMIT and OFFSET
      // We order by persons.email asc to ensure consistent pagination ordering
      const chunkRows = await baseQuery
        .select(['persons.email'])
        .distinct()
        .orderBy('persons.email', 'asc')
        .limit(batchSize)
        .offset(offset)
        .execute();

      const chunk = Array.from(new Set(chunkRows.map((r: any) => r.email?.trim()).filter(Boolean))) as string[];

      if (chunk.length === 0) {
        break;
      }

      const batchDelivered = await newsletterMailSvc.sendNewsletter({
        fromName,
        fromEmail,
        replyTo,
        recipients: chunk,
        subject: newsletter.subject || 'Newsletter',
        html: (newsletter.html_content || '') + footer.html,
        text: newsletter.plain_text_content ? newsletter.plain_text_content + footer.text : undefined,
        sendgridApiKey,
        subuserUsername,
        newsletterId,
        tenantId,
      });

      deliveredCount += batchDelivered;
      offset += chunkRows.length;

      // Update progress in the background job payload (no recipients array!)
      if (jobId) {
        await db
          .updateTable('background_jobs')
          .set({
            payload: JSON.stringify({
              type: 'send-newsletter',
              newsletterId,
              tenantId,
              userId,
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
        updatedby_id: userId,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', newsletterId)
      .execute();

    // Log user activity
    const userActivity = new UserActivityRepo();
    await userActivity.log({
      tenant_id: tenantId,
      user_id: userId,
      activity: 'send',
      entity: 'newsletters',
      entity_id: newsletterId,
      quantity: totalRecipients,
      metadata: { recipientsCount: totalRecipients, deliveredCount },
    });

    const { queueUsageLimitCheck } = await import('../../modules/billing/usage-limits');
    await queueUsageLimitCheck(tenantId, db);
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
        .insertInto('background_jobs')
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
      .limit(500)
      .execute();

    for (const enrollment of pendingEnrollments) {
      try {
        await db.transaction().execute(async (trx) => {
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
              .insertInto('background_jobs')
              .values({
                tenant_id: lockedEnrollment.tenant_id,
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

            // Only log activity if the workflow (and its creator) still exist;
            // skip the log rather than writing a row referencing a phantom user.
            if (workflow?.createdby_id) {
              const actorId = String(workflow.createdby_id);
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

    const runAt = pendingEnrollments.length === 500 ? new Date() : new Date(Date.now() + 10 * 60 * 1000);
    await db
      .insertInto('background_jobs')
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'process_drip_workflows' }),
        run_at: runAt,
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
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('sessions').where('user_id', '=', userId).execute();
        await trx.deleteFrom('profiles').where('auth_id', '=', userId).execute();
        await trx.deleteFrom('authusers').where('id', '=', userId).execute();
      });
    }

    const expiredTenants = await db
      .selectFrom('tenants')
      .select('id')
      .where('deletion_scheduled_at', '<=', now)
      .execute();

    for (const tenant of expiredTenants) {
      const tenantId = String(tenant.id);

      // Capture owner emails before deletion — background_jobs is wiped inside the transaction
      const ownerUsers = await db
        .selectFrom('authusers')
        .select(['email', 'first_name'])
        .where('tenant_id', '=', tenantId)
        .where('role', '=', 'owner')
        .execute();

      console.log(`Hard-deleting tenant ${tenantId} (deletion_scheduled_at <= now)…`);
      await db.transaction().execute(async (trx) => {
        const tid = tenantId;

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
        await trx.deleteFrom('zapier_subscriptions').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('volunteer_shifts').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('volunteer_events').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('event_registrations').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('event_ticket_types').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('events').where('tenant_id', '=', tid).execute();
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
        // Null out FK references on tenants before deleting authusers
        await trx.updateTable('tenants').set({ admin_id: null }).where('id', '=', tid).execute();
        await trx.deleteFrom('sessions').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('profiles').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('authusers').where('tenant_id', '=', tid).execute();
        await trx.deleteFrom('tenants').where('id', '=', tid).execute();

        console.log(`Tenant ${tenantId} fully hard-deleted.`);
      });

      // Send confirmation emails after the transaction commits (outside the wiped tenant scope)
      for (const owner of ownerUsers) {
        if (owner.email) {
          await mailService.sendMail({
            to: owner.email,
            subject: 'Your account data has been permanently deleted',
            text: `Hi ${owner.first_name},\n\nAll data associated with your PeopleCRM account has been permanently and securely deleted as requested. You will not be billed going forward.\n\nThank you for using PeopleCRM.`,
            html: `<h2>Account Data Deleted</h2>
<p>Hi ${owner.first_name},</p>
<p>All data associated with your PeopleCRM account has been permanently and securely deleted as requested. You will not be billed going forward.</p>
<p>Thank you for using PeopleCRM. If you ever wish to return, you are always welcome to create a new account.</p>`,
          });
        }
      }
    }

    // Permanently delete completed background jobs older than 7 days to prevent unbounded table growth
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db
      .deleteFrom('background_jobs')
      .where('status', '=', 'completed')
      .where('updated_at', '<=', sevenDaysAgo)
      .execute();

    await db
      .insertInto('background_jobs')
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'perform_scheduled_deletions' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        max_attempts: 3,
      })
      .execute();
  } else if (payload.type === 'zapier_trigger') {
    const { ZapierService } = await import('../../modules/zapier/zapier.service');
    const zapierService = new ZapierService();
    await zapierService.fireTrigger(payload.tenant_id, payload.event_type, payload.data);
  } else if (payload.type === 'check_usage_limits') {
    const { checkTenantUsage } = await import('../../modules/billing/usage-limits');
    await checkTenantUsage(payload.tenant_id, db);
  } else if (payload.type === 'check_all_usage_limits') {
    const { checkAllUsageLimits } = await import('../../modules/billing/usage-limits');
    await checkAllUsageLimits(db);
    await db
      .insertInto('background_jobs')
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
      // Make sure we're exporting one of the allowed tables
      const table = String(payload.table || payload.entity);
      const ALLOWED_EXPORT_TABLES = [
        'persons',
        'households',
        'companies',
        'forms',
        'workflows',
        'teams',
        'events',
        'newsletters',
        'tasks',
        'tags',
        'issues',
        'users',
        'user_activity',
      ];
      if (!ALLOWED_EXPORT_TABLES.includes(table)) throw new Error('Invalid export entity');

      // Mark as processing
      await exportsRepo.updateStatus(exportId, tenantId, 'processing');

      // Fetch all rows for the entity
      const opts = payload.options ?? {};
      let query: any;

      if (table === 'user_activity') {
        query = db
          .selectFrom('user_activity')
          .innerJoin('authusers', 'authusers.id', 'user_activity.user_id')
          .select([
            'user_activity.id',
            'user_activity.created_at',
            sql`TRIM(CONCAT(authusers.first_name, ' ', COALESCE(authusers.last_name, '')))::text`.as('user'),
            'authusers.email',
            'user_activity.activity',
            'user_activity.entity',
            'user_activity.entity_id',
            'user_activity.quantity',
            'user_activity.metadata',
          ])
          .where('user_activity.tenant_id', '=', tenantId as any);

        if (opts.userId) {
          query = query.where('user_activity.user_id', '=', opts.userId);
        }
        if (opts.entity) {
          query = query.where('user_activity.entity', 'in', getEntityFilterValues(opts.entity));
        }
        if (opts.activity) {
          query = query.where('user_activity.activity', '=', opts.activity);
        }
        if (opts.searchStr) {
          const search = `%${opts.searchStr.trim().toLowerCase()}%`;
          query = query.where((eb: any) =>
            eb.or([
              eb('authusers.first_name', 'ilike', search),
              eb('authusers.last_name', 'ilike', search),
              eb('user_activity.entity', 'ilike', search),
              eb('user_activity.activity', 'ilike', search),
            ]),
          );
        }
      } else {
        query = db
          .selectFrom(table as keyof Models)
          .selectAll()
          .where('tenant_id', '=', tenantId);

        // Issues are tags with type='issue'
        if (payload.entity === 'issues') {
          query = query.where('type', '=', 'issue') as any;
        }

        // Apply search string if provided
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
      }

      // Apply sort
      if (opts.sortModel?.length) {
        for (const s of opts.sortModel) {
          if (s?.colId) {
            query = query.orderBy(s.colId as any, s.sort === 'desc' ? 'desc' : 'asc') as any;
          }
        }
      } else {
        const sortCol = table === 'user_activity' ? 'user_activity.created_at' : 'created_at';
        query = query.orderBy(sortCol as any, 'desc') as any;
      }

      // Determine columns
      const requestedCols: string[] = Array.isArray(payload.columns) && payload.columns.length ? payload.columns : [];

      const storageKey = `exports/${tenantId}/${exportId}.csv`;

      // Stream the query results using query.stream()
      const dbStream = Readable.from(query.stream());
      const csvStream = new CsvTransformStream(requestedCols);

      await storageService.uploadStream(storageKey, dbStream.pipe(csvStream), 'text/csv');

      const count = csvStream.rowCount;

      // If no rows were processed, clean up by deleting the empty file if created
      if (count === 0) {
        await storageService.delete(storageKey);
      }

      await exportsRepo.updateStatus(exportId, tenantId, 'completed', {
        rowCount: count,
        storageKey: count > 0 ? storageKey : undefined,
      });

      console.log(`Export job ${exportId} completed: ${count} rows exported.`);

      // Notify the user who requested the export
      if (payload.user_id) {
        try {
          const user = await db
            .selectFrom('authusers')
            .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
            .select(['authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
            .where('authusers.id', '=', payload.user_id)
            .executeTakeFirst();

          if (user) {
            let emailOptedIn = true;
            let inAppOptedIn = true;
            const profileJson = user.profile_json;
            if (profileJson) {
              try {
                const json = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
                if (json?.notifications?.export_ready === false) {
                  emailOptedIn = false;
                }
                if (json?.notifications?.export_ready_in_app === false) {
                  inAppOptedIn = false;
                }
              } catch (e) {
                console.error('Failed to parse profile json for export notifications', e);
              }
            }

            const entityLabel = table === 'user_activity' ? 'Activity Feed' : table;
            const displayLabel = entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1);

            if (inAppOptedIn) {
              const { NotificationsRepo } = await import('../../modules/notifications/repositories/notifications.repo');
              const notificationsRepo = new NotificationsRepo();
              await notificationsRepo.pushNotification({
                tenant_id: tenantId,
                user_id: String(payload.user_id),
                title: 'Export Ready',
                message: `Your export of ${count} records from ${displayLabel} is complete.`,
                type: 'export',
                link: '/exports',
              });
            }

            if (emailOptedIn && user.email) {
              await mailService.sendMail({
                to: user.email,
                subject: `Your Export is Ready: ${payload.file_name || 'export.csv'}`,
                text: `Hi ${user.first_name || 'there'},\n\nYour export of ${count} records from the ${displayLabel} table is ready.\n\nFile Name: ${payload.file_name || 'export.csv'}\nDownload from the Exports page: ${env.appUrl}/exports`,
                html: `<p>Hi ${user.first_name || 'there'},</p><p>Your export of <strong>${count}</strong> records from the <strong>${displayLabel}</strong> table is ready.</p><p><strong>File Name:</strong> ${payload.file_name || 'export.csv'}<br><strong>Download Link:</strong> <a href="${env.appUrl}/exports">Go to Exports Page</a></p>`,
              });
            }
          }
        } catch (notifErr) {
          console.error(`Failed to send notifications for export job ${exportId}:`, notifErr);
        }
      }
    } catch (err: any) {
      console.error(`Export job ${exportId} failed:`, err);
      await exportsRepo.updateStatus(exportId, tenantId, 'failed', {
        error: (err?.message || String(err)).substring(0, 500),
      });
      throw err;
    }
  } else if (payload.type === 'prune_newsletter_events') {
    await pruneNewsletterEvents(db);
    await db
      .insertInto('background_jobs')
      .values({
        tenant_id: null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'prune_newsletter_events' }),
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        max_attempts: 3,
      })
      .execute();
  } else {
    throw new Error(`Unsupported background job type: ${payload.type}`);
  }
}

// Event types that warrant keeping a per-newsletter engagement record.
// Delivery-only events (delivered, deferred, processed) are not stored.
const ENGAGEMENT_EVENT_TYPES = new Set(['open', 'click', 'unsubscribe', 'group_unsubscribe', 'bounce', 'spamreport']);

async function pruneNewsletterEvents(db: Kysely<Models>): Promise<void> {
  const tenants: { id: string; subscription_plan: string | null }[] = await db
    .selectFrom('tenants')
    .select(['id', 'subscription_plan'])
    .execute();

  for (const tenant of tenants) {
    try {
      const plan = tenant.subscription_plan ?? 'free';
      const retentionDays =
        plan.toLowerCase() === 'representative' ? 90 : plan.toLowerCase() === 'grassroots' ? 30 : 15;

      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const tenantId = String(tenant.id);

      // Fetch events older than the retention window that are engagement events.
      const expiringEvents: {
        newsletter_id: string;
        email: string;
        event_type: string;
        timestamp: Date;
      }[] = await db
        .selectFrom('newsletter_events')
        .select(['newsletter_id', 'email', 'event_type', 'timestamp'])
        .where('tenant_id', '=', tenantId)
        .where('created_at', '<', cutoff)
        .execute();

      // Group by (newsletter_id, email) to produce one upsert per recipient.
      const grouped = new Map<
        string,
        {
          newsletter_id: string;
          email: string;
          open_count: number;
          click_count: number;
          has_unsubscribed: boolean;
          hard_bounced: boolean;
          soft_bounced: boolean;
          first_opened_at: Date | null;
          last_opened_at: Date | null;
          first_clicked_at: Date | null;
          last_clicked_at: Date | null;
          bounced_at: Date | null;
          unsubscribed_at: Date | null;
        }
      >();

      for (const ev of expiringEvents) {
        if (!ENGAGEMENT_EVENT_TYPES.has(ev.event_type)) continue;

        const key = `${ev.newsletter_id}::${ev.email}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            newsletter_id: ev.newsletter_id,
            email: ev.email,
            open_count: 0,
            click_count: 0,
            has_unsubscribed: false,
            hard_bounced: false,
            soft_bounced: false,
            first_opened_at: null,
            last_opened_at: null,
            first_clicked_at: null,
            last_clicked_at: null,
            bounced_at: null,
            unsubscribed_at: null,
          });
        }

        const agg = grouped.get(key)!;
        const ts = new Date(ev.timestamp);

        if (ev.event_type === 'open') {
          agg.open_count++;
          if (!agg.first_opened_at || ts < agg.first_opened_at) agg.first_opened_at = ts;
          if (!agg.last_opened_at || ts > agg.last_opened_at) agg.last_opened_at = ts;
        } else if (ev.event_type === 'click') {
          agg.click_count++;
          if (!agg.first_clicked_at || ts < agg.first_clicked_at) agg.first_clicked_at = ts;
          if (!agg.last_clicked_at || ts > agg.last_clicked_at) agg.last_clicked_at = ts;
        } else if (ev.event_type === 'unsubscribe' || ev.event_type === 'group_unsubscribe') {
          agg.has_unsubscribed = true;
          if (!agg.unsubscribed_at || ts < agg.unsubscribed_at) agg.unsubscribed_at = ts;
        } else if (ev.event_type === 'bounce') {
          // SendGrid bounce events don't carry a sub-type in this table;
          // treat all as hard bounce (the webhook handler can refine this).
          agg.hard_bounced = true;
          if (!agg.bounced_at) agg.bounced_at = ts;
        } else if (ev.event_type === 'spamreport') {
          agg.has_unsubscribed = true;
          if (!agg.unsubscribed_at || ts < agg.unsubscribed_at) agg.unsubscribed_at = ts;
        }
      }

      // Upsert aggregated rows, then delete the raw events.
      if (grouped.size > 0) {
        await db.transaction().execute(async (trx) => {
          for (const row of grouped.values()) {
            await trx
              .insertInto('person_newsletter_engagements')
              .values({
                tenant_id: tenantId,
                newsletter_id: row.newsletter_id,
                email: row.email,
                open_count: row.open_count,
                click_count: row.click_count,
                has_unsubscribed: row.has_unsubscribed,
                hard_bounced: row.hard_bounced,
                soft_bounced: row.soft_bounced,
                first_opened_at: row.first_opened_at,
                last_opened_at: row.last_opened_at,
                first_clicked_at: row.first_clicked_at,
                last_clicked_at: row.last_clicked_at,
                bounced_at: row.bounced_at,
                unsubscribed_at: row.unsubscribed_at,
              })
              .onConflict((oc: any) =>
                oc.columns(['tenant_id', 'newsletter_id', 'email']).doUpdateSet((eb: any) => ({
                  open_count: sql`person_newsletter_engagements.open_count + ${eb.ref('excluded.open_count')}`,
                  click_count: sql`person_newsletter_engagements.click_count + ${eb.ref('excluded.click_count')}`,
                  has_unsubscribed: sql`person_newsletter_engagements.has_unsubscribed OR excluded.has_unsubscribed`,
                  hard_bounced: sql`person_newsletter_engagements.hard_bounced OR excluded.hard_bounced`,
                  soft_bounced: sql`person_newsletter_engagements.soft_bounced OR excluded.soft_bounced`,
                  first_opened_at: sql`LEAST(person_newsletter_engagements.first_opened_at, excluded.first_opened_at)`,
                  last_opened_at: sql`GREATEST(person_newsletter_engagements.last_opened_at, excluded.last_opened_at)`,
                  first_clicked_at: sql`LEAST(person_newsletter_engagements.first_clicked_at, excluded.first_clicked_at)`,
                  last_clicked_at: sql`GREATEST(person_newsletter_engagements.last_clicked_at, excluded.last_clicked_at)`,
                  bounced_at: sql`COALESCE(person_newsletter_engagements.bounced_at, excluded.bounced_at)`,
                  unsubscribed_at: sql`COALESCE(person_newsletter_engagements.unsubscribed_at, excluded.unsubscribed_at)`,
                })),
              )
              .execute();
          }

          await trx
            .deleteFrom('newsletter_events')
            .where('tenant_id', '=', tenantId)
            .where('created_at', '<', cutoff)
            .execute();
        });
      } else {
        // No engagement events to aggregate — still prune non-engagement events.
        await db
          .deleteFrom('newsletter_events')
          .where('tenant_id', '=', tenantId)
          .where('created_at', '<', cutoff)
          .execute();
      }
    } catch (err) {
      console.error(`[prune_newsletter_events] Failed for tenant ${tenant.id}:`, err);
    }
  }
}

/**
 * Builds the mandatory newsletter footer appended server-side at send time (so it cannot be removed
 * from the editor). Contains the organization address, the tenant footer disclaimer, and a SendGrid
 * substitution tag (`<% unsubscribe %>`) that SendGrid replaces with a working unsubscribe link when
 * subscription tracking is enabled.
 */
function buildNewsletterFooter(address?: string, disclaimer?: string): { html: string; text: string } {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const htmlParts: string[] = [];
  const textParts: string[] = [];

  const addr = (address || '').trim();
  if (addr) {
    htmlParts.push(`<div>${esc(addr).replace(/\n/g, '<br>')}</div>`);
    textParts.push(addr);
  }

  const disc = (disclaimer || '').trim();
  if (disc) {
    htmlParts.push(`<div>${esc(disc).replace(/\n/g, '<br>')}</div>`);
    textParts.push(disc);
  }

  // SendGrid substitution tag — replaced with the recipient's unsubscribe URL.
  htmlParts.push('<div><a href="<% unsubscribe %>">Unsubscribe</a></div>');
  textParts.push('Unsubscribe: <% unsubscribe %>');

  const html = `<hr style="margin-top:24px"><div style="font-size:12px;color:#888;margin-top:8px">${htmlParts.join('')}</div>`;
  const text = `\n\n----\n${textParts.join('\n')}`;

  return { html, text };
}

function getEntityFilterValues(entityFilter: string): string[] {
  const ent = entityFilter.toLowerCase();
  if (ent === 'persons' || ent === 'person' || ent === 'people') {
    return ['person', 'persons'];
  }
  if (ent === 'households' || ent === 'household') {
    return ['household', 'households'];
  }
  if (ent === 'companies' || ent === 'company') {
    return ['company', 'companies'];
  }
  if (ent === 'tasks' || ent === 'task') {
    return ['task', 'tasks', 'tasks_archived'];
  }
  if (ent === 'emails' || ent === 'email') {
    return ['email', 'emails'];
  }
  if (ent === 'volunteer_events' || ent === 'volunteer_event') {
    return ['volunteer_event', 'volunteer_events'];
  }
  if (ent === 'volunteer_shifts' || ent === 'volunteer_shift') {
    return ['volunteer_shift', 'volunteer_shifts'];
  }
  if (ent === 'web_forms' || ent === 'web_form' || ent === 'forms' || ent === 'form') {
    return ['web_form', 'web_forms', 'form', 'forms'];
  }
  if (ent === 'tags' || ent === 'tag') {
    return ['tag', 'tags'];
  }
  return [ent];
}

async function recomputeTenantAddressFingerprints(tenantId: string, db: Kysely<Models>): Promise<void> {
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

async function queueUserSyncJobs(db: Kysely<Models>): Promise<void> {
  try {
    // Find all tenants with a connected Google account
    const googleTokens = await db.selectFrom('google_oauth_tokens').select('tenant_id').execute();

    for (const token of googleTokens) {
      const tenantId = String(token.tenant_id);

      // Check if there is already a pending or processing sync job for this tenant
      const existing = await db
        .selectFrom('background_jobs')
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'google_sync')
        .where(sql`payload->>'tenantId'`, '=', tenantId)
        .executeTakeFirst();

      if (!existing) {
        console.log(`Auto-scheduling Google sync job for tenant ${tenantId}`);
        await db
          .insertInto('background_jobs')
          .values({
            tenant_id: tenantId,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'google_sync',
              tenantId,
              requestedBy: 'system',
            }),
            run_at: new Date(),
            max_attempts: 3,
          })
          .execute();
      }
    }

    // Find all tenants with a connected Microsoft account
    const msTokens = await db.selectFrom('ms_oauth_tokens').select('tenant_id').execute();

    for (const token of msTokens) {
      const tenantId = String(token.tenant_id);

      // Check if there is already a pending or processing sync job for this tenant
      const existing = await db
        .selectFrom('background_jobs')
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'ms_sync')
        .where(sql`payload->>'tenantId'`, '=', tenantId)
        .executeTakeFirst();

      if (!existing) {
        console.log(`Auto-scheduling MS sync job for tenant ${tenantId}`);
        await db
          .insertInto('background_jobs')
          .values({
            tenant_id: tenantId,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'ms_sync',
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
    console.error('Failed to queue tenant sync jobs:', err);
  }
}

export async function checkDueTasks(db: Kysely<Models>): Promise<void> {
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
          textContent += `- ${t.task_name} (Due: ${dueDateStr})\n  Link: ${env.appUrl}/tasks/${t.task_id}\n\n`;
          htmlContent += `<li><strong>${t.task_name}</strong> (Due: ${dueDateStr}) - <a href="${env.appUrl}/tasks/${t.task_id}">Resolve</a></li>`;
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
