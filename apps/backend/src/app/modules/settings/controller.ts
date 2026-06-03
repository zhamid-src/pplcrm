import { IAuthKeyPayload, SettingsEntryType } from '@common';
import { TRPCError } from '@trpc/server';
import { createSigner, createVerifier } from 'fast-jwt';
import { env } from '../../../env';

import { SettingsRepo } from './repositories/settings.repo';
import { BaseController } from '../../lib/base.controller';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';

/**
 * Controller for managing settings
 *
 * Extends the base controller to provide default CRUD operations
 * for the `settings` table.
 */
export class SettingsController extends BaseController<'settings', SettingsRepo> {
  private mailService = new TransactionalEmailService();

  constructor() {
    super(new SettingsRepo());
  }

  public async getCurrentCampaignId(auth: IAuthKeyPayload) {
    const row = await this.getRepo().getByKey({
      tenant_id: auth.tenant_id,
      key: 'current_campaign',
    });

    if (!row) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Current campaign setting not found.',
      });
    }

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

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Current campaign setting is malformed.',
    });
  }

  public async getSnapshot(auth: IAuthKeyPayload) {
    const rows = await this.getRepo().getAllForTenant(auth.tenant_id);

    return rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  public async upsert(auth: IAuthKeyPayload, entries: SettingsEntryType[]) {
    // 1. Block direct updates to verified_emails setting key
    if (entries.some((entry) => entry.key === 'communications.verified_emails')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Verified emails list cannot be modified directly.',
      });
    }

    // 2. Validate default from and reply-to emails
    const defaultFromEntry = entries.find((e) => e.key === 'communications.default_from_email');
    const replyToEntry = entries.find((e) => e.key === 'communications.reply_to');

    if (defaultFromEntry || replyToEntry) {
      const snapshot = await this.getSnapshot(auth);
      const verifiedEmailsRaw = snapshot['communications.verified_emails'];
      const verifiedEmails = Array.isArray(verifiedEmailsRaw)
        ? verifiedEmailsRaw.map((e) => String(e).toLowerCase().trim())
        : [];

      if (defaultFromEntry && typeof defaultFromEntry.value === 'string') {
        const val = defaultFromEntry.value.toLowerCase().trim();
        if (val && !verifiedEmails.includes(val)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email address must be verified before it can be configured as a Default From Email.',
          });
        }
      }

      if (replyToEntry && typeof replyToEntry.value === 'string') {
        const val = replyToEntry.value.toLowerCase().trim();
        if (val && !verifiedEmails.includes(val)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email address must be verified before it can be configured as a Reply-to Email.',
          });
        }
      }
    }

    await this.getRepo().upsertMany({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      entries: entries.map((entry) => ({
        key: entry.key,
        value: entry.value as any,
      })),
    });

    return this.getSnapshot(auth);
  }

  public async requestEmailVerification(auth: IAuthKeyPayload, email: string) {
    const normalized = email.toLowerCase().trim();

    const key = process.env['SHARED_SECRET'] || env.sharedSecret;
    if (!key) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server misconfiguration: SHARED_SECRET is missing.',
      });
    }

    const signer = createSigner({
      algorithm: 'HS256',
      key,
      expiresIn: '24h',
    });

    const token = signer({
      tenant_id: auth.tenant_id,
      email: normalized,
      purpose: 'verify-sender-email',
    });

    const verificationLink = `http://localhost:4200/verify-sender-email?token=${token}`;

    await this.mailService.enqueueMail({
      to: normalized,
      tenant_id: auth.tenant_id,
      subject: 'Verify sender email address for your CampaignRaven campaign',
      text: `Hi,\n\nPlease verify your email address by clicking this link: ${verificationLink}\n\nThis link will expire in 24 hours.`,
      html: `<h3>Verify Sender Email</h3><p>Please click the link below to verify your email address for your CampaignRaven campaign:</p><p><a href="${verificationLink}">${verificationLink}</a></p><p>This link will expire in 24 hours.</p>`,
    });

    return { success: true };
  }

  public async verifySenderEmail(token: string) {
    const key = process.env['SHARED_SECRET'] || env.sharedSecret;
    if (!key) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server misconfiguration: SHARED_SECRET is missing.',
      });
    }

    const verifier = createVerifier({
      algorithms: ['HS256'],
      key,
      ignoreExpiration: false,
    });

    try {
      const payload = await verifier(token);
      if (!payload || payload.purpose !== 'verify-sender-email' || !payload.tenant_id || !payload.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification token.',
        });
      }

      const tenantId = String(payload.tenant_id);
      const email = String(payload.email).toLowerCase().trim();

      const row = await this.getRepo().getByKey({
        tenant_id: tenantId,
        key: 'communications.verified_emails',
      });

      let currentList: string[] = [];
      if (row && Array.isArray(row.value)) {
        currentList = row.value.map((e) => String(e).toLowerCase().trim());
      }

      if (!currentList.includes(email)) {
        currentList.push(email);

        const tenant = await this.getRepo()
          .db.selectFrom('tenants')
          .select('admin_id')
          .where('id', '=', BigInt(tenantId) as any)
          .executeTakeFirst();
        const adminId = tenant?.admin_id ? String(tenant.admin_id) : '1';

        await this.getRepo().upsertMany({
          tenant_id: tenantId,
          user_id: adminId,
          entries: [{ key: 'communications.verified_emails', value: currentList }],
        });
      }

      return { success: true, email };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid or expired verification token.',
      });
    }
  }

  public async scheduleTenantDeletion(auth: IAuthKeyPayload) {
    const tenant = await this.getRepo().db.selectFrom('tenants')
      .selectAll()
      .where('id', '=', BigInt(auth.tenant_id) as any)
      .executeTakeFirst();
    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tenant not found.',
      });
    }

    if (String(tenant.admin_id) !== String(auth.user_id)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the organization administrator can schedule deletion.',
      });
    }

    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.getRepo().db.updateTable('tenants')
      .set({ deletion_scheduled_at: deletionDate })
      .where('id', '=', BigInt(auth.tenant_id) as any)
      .execute();

    const admin = await this.getRepo().db.selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('id', '=', BigInt(auth.user_id) as any)
      .executeTakeFirst();

    if (admin && admin.email) {
      await this.mailService.sendMail({
        to: admin.email,
        tenant_id: auth.tenant_id,
        subject: 'Security Alert: Organization Scheduled for Deletion',
        text: `Hi ${admin.first_name || 'Admin'},\n\nYour organization ${tenant.name} has been scheduled for deletion on ${deletionDate.toLocaleDateString()}.\n\nTo cancel, please trigger a cancel restoration request in your dashboard settings.`,
        html: `<h2>Organization Scheduled for Deletion</h2>
<p>Hi ${admin.first_name || 'Admin'},</p>
<p>The organization <strong>${tenant.name}</strong> (Tenant ID: ${auth.tenant_id}) has been scheduled for permanent deletion on <strong>${deletionDate.toLocaleDateString()}</strong>.</p>
<p>All data including campaigns, contacts, lists, workflows, and user accounts under this tenant will be permanently deleted. If you did not make this request or wish to cancel it, please click the button below to cancel the deletion:</p>
<div class="btn-container">
  <a href="http://localhost:4200/settings" class="btn">Manage Organization Settings</a>
</div>
<p class="warning">If you did not schedule this deletion, please contact support immediately.</p>`,
      });
    }

    return { success: true, deletion_scheduled_at: deletionDate };
  }

  public async cancelTenantDeletion(auth: IAuthKeyPayload) {
    const tenant = await this.getRepo().db.selectFrom('tenants')
      .selectAll()
      .where('id', '=', BigInt(auth.tenant_id) as any)
      .executeTakeFirst();
    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tenant not found.',
      });
    }

    if (String(tenant.admin_id) !== String(auth.user_id)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the organization administrator can cancel deletion.',
      });
    }

    await this.getRepo().db.updateTable('tenants')
      .set({ deletion_scheduled_at: null })
      .where('id', '=', BigInt(auth.tenant_id) as any)
      .execute();

    const admin = await this.getRepo().db.selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('id', '=', BigInt(auth.user_id) as any)
      .executeTakeFirst();

    if (admin && admin.email) {
      await this.mailService.sendMail({
        to: admin.email,
        tenant_id: auth.tenant_id,
        subject: 'CampaignRaven - Organization Deletion Canceled',
        text: `Your request to delete organization ${tenant.name} has been successfully canceled, and your organization is fully restored.`,
        html: `<h2>Organization Deletion Canceled</h2>
<p>Your request to delete organization <strong>${tenant.name}</strong> has been successfully canceled. Your organization and all associated campaign data are fully restored.</p>`,
      });
    }

    return { success: true };
  }
}
