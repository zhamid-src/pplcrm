import { StorageService } from '../storage.service';
import { PersonsService } from '../../modules/persons/services/persons.service';
import { DuplicateMaintenanceService } from '../../modules/persons/services/duplicate-maintenance.service';
import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { ListsController } from '../../modules/lists/controller';
import { ActivityController } from '../../modules/activity/controller';
import { GoogleOAuthService } from '../../modules/google-sync/google-oauth.service';
import { GoogleSyncService } from '../../modules/google-sync/google-sync.service';
import { MsOAuthService } from '../../modules/ms-sync/ms-oauth.service';
import { MsSyncService } from '../../modules/ms-sync/ms-sync.service';
import { env } from '../../../env';
import { sql } from 'kysely';
import { TransactionalEmailService } from '../mail/transactional-mail.service';

const storageService = new StorageService();
const importsRepo = new ImportsRepo();
const mailService = new TransactionalEmailService();

export async function executeJob(payload: any, db: any): Promise<void> {
  if (payload.type === 'refresh_list') {
    const listsController = new ListsController();
    await listsController.executeListRefresh(payload.tenant_id, payload.list_id, payload.user_id);
  } else if (payload.type === 'cleanup_activities') {
    const activityController = new ActivityController();
    await activityController.deleteOldActivities();

    // Schedule next cleanup_activities job 24 hours later
    await db.insertInto('background_jobs' as any)
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
    await db.insertInto('background_jobs' as any)
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
  } else if (payload.type === 'potential_duplicates_maintenance') {
    const maintenanceSvc = new DuplicateMaintenanceService();
    await maintenanceSvc.runMaintenance(
      payload.tenant_id,
      payload.person_ids || [],
      payload.group_keys || []
    );
  } else if (payload.type === 'recompute_all_duplicates') {
    const tenants = await db
      .selectFrom('tenants')
      .select('id')
      .execute();

    const maintenanceSvc = new DuplicateMaintenanceService();
    for (const tenant of tenants) {
      try {
        await maintenanceSvc.recomputeAllDuplicates(String(tenant.id));
      } catch (tenantErr) {
        console.error(`Failed to recompute duplicates for tenant ${tenant.id}:`, tenantErr);
      }
    }

    await db.insertInto('background_jobs' as any)
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
      .select(['name', 'start_time', 'end_time', 'location_address'])
      .where('id', '=', payload.eventId as any)
      .executeTakeFirst();

    if (!event) {
      throw new Error(`Event not found: ${payload.eventId}`);
    }

    const startFormatted = new Date(event.start_time).toLocaleString();
    const endFormatted = new Date(event.end_time).toLocaleString();

    // 1. Send Confirmation Email to the Constituent
    await mailService.sendMail({
      to: payload.email,
      subject: `Volunteer Signup Confirmation: ${event.name}`,
      text: `Hi ${payload.firstName || 'there'},\n\nThank you for signing up to volunteer for "${event.name}"!\n\nDetails:\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}\n\nWe look forward to seeing you there!`,
      html: `<p>Hi ${payload.firstName || 'there'},</p><p>Thank you for signing up to volunteer for <strong>"${event.name}"</strong>!</p><p><strong>Details:</strong><br>Date & Time: ${startFormatted} - ${endFormatted}<br>Location: ${event.location_address || 'TBD'}</p><p>We look forward to seeing you there!</p>`,
    });

    // 2. Send Alert Email to the Tenant Admin
    const admin = await db.selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', payload.tenantId as any)
      .limit(1)
      .executeTakeFirst();

    if (admin && admin.email) {
      await mailService.sendMail({
        to: admin.email,
        subject: `[ALERT] New Volunteer Signup for ${event.name}`,
        text: `Hi ${admin.first_name || 'Admin'},\n\nA new constituent has signed up to volunteer for "${event.name}".\n\nName: ${payload.firstName || ''} ${payload.lastName || ''}\nEmail: ${payload.email}\nPhone: ${payload.mobile || 'N/A'}\nNotes: ${payload.notes || 'None'}`,
        html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>A new constituent has signed up to volunteer for <strong>"${event.name}"</strong>.</p><p><strong>Volunteer Details:</strong><br>Name: ${payload.firstName || ''} ${payload.lastName || ''}\nEmail: ${payload.email}<br>Phone: ${payload.mobile || 'N/A'}\nNotes: ${payload.notes || 'None'}</p>`,
      });
    }
  } else if (payload.type === 'send-shift-reminder') {
    const shift = await db
      .selectFrom('volunteer_shifts')
      .selectAll()
      .where('id', '=', payload.shiftId as any)
      .executeTakeFirst() as any;

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
      .where('id', '=', shift.event_id as any)
      .executeTakeFirst() as any;

    if (!event) {
      console.log(`Skipping shift reminder: event ${shift.event_id} not found.`);
      return;
    }

    if (event.send_reminder === false) {
      console.log(`Skipping shift reminder: reminders disabled for event ${event.id}.`);
      return;
    }

    const person = await db
      .selectFrom('persons')
      .selectAll()
      .where('id', '=', shift.person_id as any)
      .executeTakeFirst() as any;

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

    const subject = `Volunteer Shift Reminder: ${event.name}`;
    const text = `Hi ${person.first_name || 'there'},\n\nThis is a reminder that you have an upcoming volunteer shift for "${event.name}".\n\nDetails:\nDate & Time: ${startFormatted} - ${endFormatted}\nLocation: ${event.location_address || 'TBD'}\n\nThank you for volunteering, and we look forward to seeing you there!`;
    const html = `<p>Hi ${person.first_name || 'there'},</p><p>This is a reminder that you have an upcoming volunteer shift for <strong>"${event.name}"</strong>.</p><p><strong>Details:</strong><br>Date & Time: ${startFormatted} - ${endFormatted}<br>Location: ${event.location_address || 'TBD'}</p><p>Thank you for volunteering, and we look forward to seeing you there!</p>`;

    await mailService.sendMail({
      to: person.email,
      subject,
      text,
      html,
    });

    console.log(`Successfully sent shift reminder email to ${person.email} for shift ${shift.id}`);
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

    // 5. Clean up temporary payload file from storage
    try {
      await storageService.delete(payload.storage_key);
    } catch (storageErr) {
      console.error(`Failed to clean up storage key ${payload.storage_key}:`, storageErr);
    }
  } else {
    throw new Error(`Unsupported background job type: ${payload.type}`);
  }
}

async function queueUserSyncJobs(db: any): Promise<void> {
  try {
    // Find all connected Google accounts
    const googleTokens = await db
      .selectFrom('google_oauth_tokens')
      .select(['user_id', 'tenant_id'])
      .execute();

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
    const msTokens = await db
      .selectFrom('ms_oauth_tokens')
      .select(['user_id', 'tenant_id'])
      .execute();

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
