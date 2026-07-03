import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { createSigner, createVerifier } from 'fast-jwt';
import type { QueryResult, Transaction } from 'kysely';

import type {
  IAuthKeyPayload,
  INow,
  IToken,
  InviteAuthUserType,
  UpdateAuthUserType,
  getAllOptionsType,
  signInInputType,
  signUpInputType,
} from '../../../../../../libs/common/src';
import type {
  AuthUsersType,
  GetOperandType,
  Keys,
  Models,
  OperationDataType,
  TablesOperationMap,
} from '../../../../../../libs/common/src/lib/kysely.models';
import { env } from '../../../env';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  PreconditionFailedError,
  ServerMisconfigError,
  UnauthorizedError,
} from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import type { QueryParams } from '../../lib/base.repo';
import { COMMON_PASSWORDS } from '../../lib/common-passwords';
import { getPwnedCount } from '../../lib/hibp';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';
import { hashPassword, verifyPassword } from '../../lib/password-hash';
import { StorageService } from '../../lib/storage.service';
import { generateToken, hashToken } from '../../lib/token-hash';
import { EmailRepo } from '../emails/repositories/email.repo';
import { PersonsRepo } from '../persons/repositories/persons.repo';
import { TagsRepo } from '../tags/repositories/tags.repo';
import { UserProfiles } from '../userprofiles/repositories/userprofiles.repo';
import { seedOnboardingData } from './onboarding-seed';
import { AuthUsersRepo } from './repositories/authusers.repo';
import { SessionsRepo } from './repositories/sessions.repo';
import { TenantsRepo } from './repositories/tenants.repo';
import { logger } from '../../logger';

export class AuthController extends BaseController<'authusers', AuthUsersRepo> {
  private static readonly AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private static readonly AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  private emailsRepo: EmailRepo = new EmailRepo();
  private mailService = new TransactionalEmailService();
  private personsRepo: PersonsRepo = new PersonsRepo();
  private profiles: UserProfiles = new UserProfiles();
  private sessions: SessionsRepo = new SessionsRepo();
  private storage = new StorageService();
  private tagsRepo: TagsRepo = new TagsRepo();
  private tenants: TenantsRepo = new TenantsRepo();

  constructor() {
    super(new AuthUsersRepo());
  }

  public async adminTriggerPasswordReset(auth: IAuthKeyPayload, userId: string) {
    const callerRole = auth.role;
    if (callerRole === 'user') {
      throw new ForbiddenError('You do not have permission to trigger password resets.');
    }

    const user = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: userId });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;

    if (callerRole === 'admin' && authUser.role === 'owner') {
      throw new ForbiddenError('Admins cannot trigger password resets for owners.');
    }

    return await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        const codeObj = await this.getRepo().addPasswordResetCode(authUser.id, trx);
        const code = codeObj?.password_reset_code;

        await this.mailService.enqueueMail(
          {
            to: authUser.email,
            tenant_id: auth.tenant_id,
            subject: 'Password Reset Request',
            text: `Hi ${authUser.first_name},\n\nAn administrator has initiated a password reset for your account.\n\nPlease reset your password using the link below:\n${env.appUrl}/new-password?code=${code}\n\nThis link is valid for 15 minutes.`,
            html: `<h2>Password Reset Request</h2>
<p>Hi ${authUser.first_name},</p>
<p>An administrator has initiated a password reset for your account.</p>
<p>Please click the button below to reset your password and select a new one:</p>
<div class="btn-container">
  <a href="${env.appUrl}/new-password?code=${code}" class="btn">Reset Password</a>
</div>
<p class="warning">For security reasons, this reset link is single-use and will expire in 15 minutes.</p>`,
          },
          trx,
        );

        return { success: true };
      });
  }

  public async cancelAccountDeletion(auth: IAuthKeyPayload) {
    const user = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: auth.user_id });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;

    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        await trx.updateTable('authusers').set({ deletion_scheduled_at: null }).where('id', '=', authUser.id).execute();

        await this.mailService.enqueueMail(
          {
            to: authUser.email,
            tenant_id: auth.tenant_id,
            subject: 'Account Deletion Canceled',
            text: `Your request to delete your account has been successfully canceled, and your account is fully restored.`,
            html: `<h2>Account Deletion Canceled</h2>
<p>Your request to delete your account has been successfully canceled, and your account is fully restored. Welcome back!</p>`,
          },
          trx,
        );
      });

    return { success: true };
  }

  public async cancelEmailChange(auth: IAuthKeyPayload) {
    if (!auth?.user_id) {
      throw new UnauthorizedError();
    }

    const repo = this.getRepo();
    const user = await repo.getOneBy('id', { tenant_id: auth.tenant_id, value: auth.user_id });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const authUser = user as AuthUsersType;

    if (!authUser.previous_email) {
      throw new BadRequestError('No email change in progress.');
    }

    const previousEmail = authUser.previous_email;

    await repo.transaction().execute(async (trx) => {
      await trx
        .updateTable('authusers')
        .set({
          email: previousEmail,
          role: authUser.previous_role,
          verified: true,
          previous_email: null,
          previous_role: null,
          password_reset_code: null,
          password_reset_code_created_at: null,
          updated_at: new Date(),
          updatedby_id: auth.user_id,
        })
        .where('id', '=', authUser.id)
        .execute();
    });

    return { success: true };
  }

  public async cancelTenantDeletion(auth: IAuthKeyPayload) {
    const db = this.getRepo().db;

    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'deletion_scheduled_at'])
      .where('id', '=', auth.tenant_id)
      .executeTakeFirst();

    if (!tenant) throw new NotFoundError('Tenant not found');
    if (!tenant.deletion_scheduled_at) throw new BadRequestError('No deletion is scheduled for this account.');
    if (tenant.deletion_scheduled_at <= new Date()) {
      throw new BadRequestError('The deletion window has already passed and data has been removed.');
    }

    const ownerEmail = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', auth.tenant_id)
      .where('role', '=', 'owner')
      .executeTakeFirst();

    await db.updateTable('tenants').set({ deletion_scheduled_at: null }).where('id', '=', auth.tenant_id).execute();

    if (ownerEmail?.email) {
      await this.mailService.sendMail({
        to: ownerEmail.email,
        tenant_id: String(auth.tenant_id),
        subject: 'Account deletion cancelled',
        text: `Hi ${ownerEmail.first_name},\n\nYour account deletion request has been successfully cancelled. Your account and all data remain intact.`,
        html: `<h2>Account Deletion Cancelled</h2>
<p>Hi ${ownerEmail.first_name},</p>
<p>Your account deletion request has been successfully cancelled. Your account and all data remain intact. Welcome back!</p>`,
      });
    }

    return { success: true };
  }

  public async cancelTenantDeletionByToken(tenantId: string, token: string) {
    const expectedToken = this.makeDeletionCancelToken(tenantId);
    const expected = Buffer.from(expectedToken);
    const provided = Buffer.from(token.length === expected.length ? token : expectedToken); // same length for safe compare
    if (token.length !== expectedToken.length || !timingSafeEqual(expected, provided)) {
      throw new BadRequestError('Invalid or expired cancellation link.');
    }

    const db = this.getRepo().db;
    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'deletion_scheduled_at'])
      .where('id', '=', tenantId)
      .executeTakeFirst();

    if (!tenant) throw new NotFoundError('Account not found.');
    if (!tenant.deletion_scheduled_at) throw new BadRequestError('No deletion is pending for this account.');
    if (tenant.deletion_scheduled_at <= new Date()) {
      throw new BadRequestError('The deletion window has already passed and data has been removed.');
    }

    const ownerEmail = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', tenantId)
      .where('role', '=', 'owner')
      .executeTakeFirst();

    await db.updateTable('tenants').set({ deletion_scheduled_at: null }).where('id', '=', tenantId).execute();

    if (ownerEmail?.email) {
      await this.mailService.sendMail({
        to: ownerEmail.email,
        subject: 'Account deletion cancelled',
        text: `Hi ${ownerEmail.first_name},\n\nYour account deletion has been successfully cancelled. Your account and all data remain intact. You can sign back in at any time.`,
        html: `<h2>Account Deletion Cancelled</h2>
<p>Hi ${ownerEmail.first_name},</p>
<p>Your account deletion has been successfully cancelled. Your account and all data remain intact.</p>
<p><a href="${env.appUrl}/signin">Sign back in</a> to continue using PeopleCRM.</p>`,
      });
    }

    return { success: true };
  }

  public async currentUser(auth: IAuthKeyPayload) {
    // There's no user ID, which means that the user is unauthorized
    if (!auth?.user_id) {
      throw new UnauthorizedError();
    }
    const options = {
      columns: ['id', 'email', 'first_name', 'role', 'verified', 'passkey_setup_dismissed_at'],
    } as QueryParams<'authusers'>;

    try {
      const user = await this.getRepo().getOneBy('id', {
        tenant_id: auth.tenant_id,
        value: auth.user_id,
        options,
      });
      if (!user) return null;

      const typedUser = user as { id: string; verified: boolean; passkey_setup_dismissed_at: Date | null };
      const profile = (await this.profiles.getOneByAuthId(String(typedUser.id))) as Models['profiles'] | undefined;
      const avatar_url = profile?.['avatar_file_id'] ? `/api/files/download/${profile['avatar_file_id']}` : null;

      let tenant_deletion_scheduled_at: Date | null = null;
      let tenant_paused_at: Date | null = null;
      if (auth.tenant_id) {
        const tenant = await this.getRepo()
          .db.selectFrom('tenants')
          .select(['deletion_scheduled_at', 'paused_at'])
          .where('id', '=', auth.tenant_id)
          .executeTakeFirst();
        if (tenant?.deletion_scheduled_at) {
          tenant_deletion_scheduled_at = tenant.deletion_scheduled_at;
        }
        if (tenant?.paused_at) {
          tenant_paused_at = tenant.paused_at;
        }
      }

      return {
        ...user,
        avatar_url,
        email_verified: this.coerceBoolean(typedUser.verified),
        passkey_setup_dismissed_at: typedUser.passkey_setup_dismissed_at ?? null,
        tenant_deletion_scheduled_at,
        tenant_paused_at,
      };
    } catch (err) {
      throw new InternalError('Something went wrong, please try again', undefined, { cause: err });
    }
  }

  public async deleteAvatar(auth: IAuthKeyPayload) {
    const existingProfile = await this.profiles.getOneByAuthId(auth.user_id);
    if (!existingProfile?.avatar_file_id) return { success: true };

    const fileId = existingProfile.avatar_file_id;

    await this.getRepo()
      .db.transaction()
      .execute(async (trx) => {
        try {
          const oldFile = await trx
            .selectFrom('files')
            .select('storage_key')
            .where('tenant_id', '=', auth.tenant_id)
            .where('id', '=', fileId)
            .executeTakeFirst();
          if (oldFile?.storage_key) await this.storage.delete(oldFile.storage_key);
          await trx.deleteFrom('files').where('tenant_id', '=', auth.tenant_id).where('id', '=', fileId).execute();
        } catch {
          /* non-critical */
        }

        await trx
          .updateTable('profiles')
          .set({ avatar_file_id: null, updated_at: new Date(), updatedby_id: auth.user_id })
          .where('tenant_id', '=', auth.tenant_id)
          .where('auth_id', '=', auth.user_id)
          .execute();
      });

    return { success: true };
  }

  public async deleteUser(auth: IAuthKeyPayload, userId: string) {
    const callerRole = auth.role;
    if (callerRole !== 'admin' && callerRole !== 'owner') {
      throw new ForbiddenError('Only admins and owners can delete users.');
    }

    const userIdToDelete = String(userId);
    if (userIdToDelete === auth.user_id) {
      throw new BadRequestError('You cannot delete yourself.');
    }

    const repo = this.getRepo();
    const user = await repo.getOneBy('id', { tenant_id: auth.tenant_id, value: userIdToDelete });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;

    if (callerRole === 'admin' && authUser.role === 'owner') {
      throw new ForbiddenError('Admins cannot delete owner accounts.');
    }

    return await repo.transaction().execute(async (trx) => {
      const profile = await this.profiles.getOneByAuthId(userIdToDelete);
      if (profile?.avatar_file_id) {
        try {
          const oldFile = await trx
            .selectFrom('files')
            .select('storage_key')
            .where('tenant_id', '=', auth.tenant_id)
            .where('id', '=', profile.avatar_file_id)
            .executeTakeFirst();
          if (oldFile?.storage_key) await this.storage.delete(oldFile.storage_key);
          await trx
            .deleteFrom('files')
            .where('tenant_id', '=', auth.tenant_id)
            .where('id', '=', profile.avatar_file_id)
            .execute();
        } catch (err) {
          logger.error({ err }, 'Failed to clean up user avatar on delete');
        }
      }

      await trx
        .deleteFrom('profiles')
        .where('tenant_id', '=', auth.tenant_id)
        .where('auth_id', '=', userIdToDelete)
        .execute();
      await this.sessions.deleteByUserId(userIdToDelete, auth.tenant_id, trx);
      await trx
        .deleteFrom('authusers')
        .where('id', '=', userIdToDelete)
        .where('tenant_id', '=', auth.tenant_id)
        .execute();

      await this.ensureAtLeastOneOwner(auth.tenant_id, trx, false, userIdToDelete);

      await this.userActivity.log(
        {
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          activity: 'delete',
          entity: 'authusers',
          entity_id: userIdToDelete,
          quantity: 1,
          metadata: {
            id: userIdToDelete,
            entity_label: `${authUser.first_name} ${authUser.last_name || ''}`.trim(),
          },
        },
        trx,
      );

      return { success: true };
    });
  }

  public async dismissPasskeyPrompt(auth: IAuthKeyPayload) {
    await this.getRepo()
      .db.updateTable('authusers')
      .set({ passkey_setup_dismissed_at: new Date() })
      .where('id', '=', auth.user_id)
      .where('tenant_id', '=', auth.tenant_id)
      .execute();
    return { success: true };
  }

  public async ensureAtLeastOneOwner(
    tenantId: string,
    trx: Transaction<Models>,
    isRoleChange = false,
    excludeUserId?: string,
  ) {
    const activeOwners = await trx
      .selectFrom('authusers')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where((eb) =>
        eb.or([eb('role', '=', 'owner'), eb.and([eb('role', '=', 'viewer'), eb('previous_role', '=', 'owner')])]),
      )
      .where('deletion_scheduled_at', 'is', null)
      .execute();

    if (activeOwners.length > 0) {
      return;
    }

    // Find the oldest active user to promote
    let query = trx
      .selectFrom('authusers')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where('deletion_scheduled_at', 'is', null);

    if (excludeUserId) {
      query = query.where('id', '!=', excludeUserId);
    }

    const oldestUser = await query.orderBy('created_at', 'asc').executeTakeFirst();

    if (oldestUser) {
      await trx.updateTable('authusers').set({ role: 'owner' }).where('id', '=', oldestUser.id).execute();
    } else if (isRoleChange) {
      throw new BadRequestError('The system must have at least one owner.');
    }
  }

  public async getAllUsers(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    const sanitizedOptions = options ? ({ ...options, columns: undefined } as typeof options) : undefined;
    const result = await this.getRepo().getAllWithCounts({
      tenant_id: auth.tenant_id,
      options: sanitizedOptions as never,
    });
    return {
      rows: result.rows.map((row) => ({
        ...this.sanitizeUser(row),
        avatar_url: row['avatar_file_id'] ? `/api/files/download/${row['avatar_file_id']}` : null,
      })),
      count: result.count,
    };
  }

  public async getTenantAccountStatus(auth: IAuthKeyPayload) {
    const tenant = await this.getRepo()
      .db.selectFrom('tenants')
      .select(['deletion_scheduled_at', 'suspended_at', 'paused_at'])
      .where('id', '=', auth.tenant_id)
      .executeTakeFirst();

    if (!tenant) throw new NotFoundError('Tenant not found');

    return {
      deletion_scheduled_at: tenant.deletion_scheduled_at ?? null,
      suspended_at: tenant.suspended_at ?? null,
      paused_at: tenant.paused_at ?? null,
    };
  }

  public async getUserById(auth: IAuthKeyPayload, id: string) {
    const callerRole = auth.role;
    if (callerRole === 'user' && auth.user_id !== String(id)) {
      throw new ForbiddenError('You do not have permission to view this user.');
    }

    const record = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: id });
    if (!record) throw new NotFoundError('User not found');
    const authUser = record as AuthUsersType;
    const profile = (await this.profiles.getOneByAuthId(String(authUser.id))) as Models['profiles'] | undefined;
    const stats = await this.buildUserStats(auth, String(authUser.id));
    const sanitized = this.sanitizeUser({ ...authUser, profile });
    const avatar_url = profile?.['avatar_file_id'] ? `/api/files/download/${profile['avatar_file_id']}` : null;
    return { ...sanitized, avatar_url, stats };
  }

  public async getUsersList(auth: IAuthKeyPayload) {
    const result = await this.getRepo().getAllWithCounts({
      tenant_id: auth.tenant_id,
    });
    return result.rows.map((row) => ({
      ...this.sanitizeUser(row),
      avatar_url: row['avatar_file_id'] ? `/api/files/download/${row['avatar_file_id']}` : null,
    }));
  }

  public async inviteUser(auth: IAuthKeyPayload, input: InviteAuthUserType) {
    const callerRole = auth.role;
    if (callerRole === 'user') {
      throw new ForbiddenError('You do not have permission to invite users.');
    }
    if (callerRole === 'admin' && input.role === 'owner') {
      throw new ForbiddenError('Admins cannot invite users with the Owner role.');
    }

    const email = input.email.toLowerCase();
    await this.verifyUserDoesNotExist(email);

    // Fall back to the tenant's configured default invite role when the caller didn't specify one.
    let role = input.role ?? null;
    if (!role) {
      const defaultRole = await this.getTenantSetting(auth.tenant_id, 'access.default_role');
      if (typeof defaultRole === 'string' && defaultRole.trim()) role = defaultRole.trim();
    }
    if (callerRole === 'admin' && role === 'owner') {
      throw new ForbiddenError('Admins cannot invite users with the Owner role.');
    }

    const tempPassword = this.generateTempPassword();
    const password = await hashPassword(tempPassword);
    const repo = this.getRepo();

    const created = await repo.transaction().execute(async (trx) => {
      const row = {
        tenant_id: auth.tenant_id,
        email,
        password,
        first_name: input.first_name,
        role,
        verified: false,
        createdby_id: auth.user_id,
        updatedby_id: auth.user_id,
      } as OperationDataType<'authusers', 'insert'>;
      const user = await repo.add({ row }, trx);
      if (!user) throw new InternalError('User creation failed');

      const profileRow = {
        id: user.id,
        tenant_id: auth.tenant_id,
        auth_id: user.id,
        last_name: input.last_name ?? null,
        createdby_id: auth.user_id,
        updatedby_id: auth.user_id,
      } as OperationDataType<'profiles', 'insert'>;
      await this.profiles.add({ row: profileRow }, trx);

      const codeObj = await repo.addPasswordResetCode(user.id, trx);
      const code = codeObj?.password_reset_code;
      await this.mailService.enqueueMail(
        {
          to: email,
          tenant_id: auth.tenant_id,
          subject: `You've been invited to join ${auth.name} on CampaignRaven`,
          text: `Hi ${input.first_name},\n\nYou have been invited to join the campaign team by ${auth.name}.\n\nYour temporary password is: ${tempPassword}\n\nActivate your account at: ${env.appUrl}/new-password?code=${code}`,
          html: `<h2>You've Been Invited!</h2>
<p>Hi ${input.first_name},</p>
<p>You have been invited to join the campaign team by <strong>${auth.name}</strong>.</p>
<p>To join the team, activate your account, and set up your password, click the button below:</p>
<div class="btn-container">
  <a href="${env.appUrl}/new-password?code=${code}" class="btn">Activate Account</a>
</div>
<p>Your temporary password is: <code>${tempPassword}</code></p>
<p class="warning">If you did not expect this invitation, you can safely ignore this email.</p>`,
        },
        trx,
      );

      await this.userActivity.log(
        {
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          activity: 'create',
          entity: 'authusers',
          entity_id: String(user.id),
          quantity: 1,
          metadata: {
            id: String(user.id),
            entity_label: `${user.first_name} ${input.last_name || ''}`.trim(),
          },
        },
        trx,
      );

      return user;
    });

    const db = repo.db;
    try {
      const { queueUsageLimitCheck } = await import('../billing/usage-limits');
      await queueUsageLimitCheck(auth.tenant_id, db);
    } catch (err) {
      logger.error({ err }, 'Failed to trigger usage check in inviteUser');
    }

    return this.sanitizeUser({ ...created, last_name: input.last_name });
  }

  public makeDeletionCancelToken(tenantId: string): string {
    return createHmac('sha256', env.sharedSecret).update(`cancel-deletion:${tenantId}`).digest('hex');
  }

  public async pauseTenant(auth: IAuthKeyPayload) {
    const db = this.getRepo().db;

    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'paused_at'])
      .where('id', '=', auth.tenant_id)
      .executeTakeFirst();

    if (!tenant) throw new NotFoundError('Tenant not found');
    if (tenant.paused_at) throw new BadRequestError('Account is already paused.');

    const ownerEmail = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', auth.tenant_id)
      .where('role', '=', 'owner')
      .executeTakeFirst();

    await db.transaction().execute(async (trx) => {
      await trx.updateTable('tenants').set({ paused_at: new Date() }).where('id', '=', auth.tenant_id).execute();

      // Sign out all users immediately so the pause takes effect for active sessions
      await trx.deleteFrom('sessions').where('tenant_id', '=', auth.tenant_id).execute();
    });

    if (ownerEmail?.email) {
      await this.mailService.sendMail({
        to: ownerEmail.email,
        tenant_id: String(auth.tenant_id),
        subject: 'Your account has been paused',
        text: `Hi ${ownerEmail.first_name},\n\nYour account has been paused. Your data is preserved and billing has been paused. You can reactivate your account at any time by logging back in and visiting your account settings.`,
        html: `<h2>Account Paused</h2>
<p>Hi ${ownerEmail.first_name},</p>
<p>Your account has been paused as requested. Your data is safely preserved and you will not be billed during this period.</p>
<p>You can reactivate your account at any time by logging back in and visiting your account settings.</p>`,
      });
    }

    return { success: true };
  }

  public async renewAuthToken(input: IToken) {
    if (!input?.auth_token || !input?.refresh_token) {
      throw new UnauthorizedError();
    }
    try {
      // 1. Verify the signature of the expired auth token (ignoring expiration)
      const payload = (await renewalVerifier(input.auth_token)) as Record<string, unknown>;

      // Basic payload validation
      if (!payload?.['user_id'] || !payload?.['tenant_id'] || !payload?.['name'] || !payload?.['session_id']) {
        throw new UnauthorizedError();
      }

      // 2. Hash the session ID and incoming refresh token
      const sessionHash = hashToken(payload['session_id'] as string);
      const refreshHash = hashToken(input.refresh_token);

      // 3. Verify that the session is active and matches in the database
      const session = await this.sessions.db
        .selectFrom('sessions')
        .select(['id', 'expires_at', 'last_used_at'])
        .where('session_id', '=', sessionHash)
        .where('refresh_token', '=', refreshHash)
        .where('user_id', '=', payload['user_id'] as string)
        .where('tenant_id', '=', payload['tenant_id'] as string)
        .where('status', '=', 'active')
        .executeTakeFirst();

      if (!session) {
        throw new UnauthorizedError();
      }

      const now = new Date();

      if (session.expires_at && session.expires_at < now) {
        throw new UnauthorizedError('Session has expired. Please sign in again.');
      }

      if (session.last_used_at) {
        const idleMs = now.getTime() - session.last_used_at.getTime();
        if (idleMs > IDLE_TIMEOUT_MS) {
          throw new UnauthorizedError('Session timed out due to inactivity. Please sign in again.');
        }
      }

      // 4. Generate a new set of tokens and delete the old session
      return this.createTokens({
        user_id: payload['user_id'] as string,
        tenant_id: payload['tenant_id'] as string,
        name: payload['name'] as string,
        oldSession: payload['session_id'] as string,
        existingExpiresAt: session.expires_at ?? null,
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError();
    }
  }

  public async resendVerificationEmail(email: string) {
    // Never reveal whether an account exists (or is already verified): return a
    // uniform success for unknown/verified addresses to prevent enumeration.
    let user: AuthUsersType;
    try {
      user = await this.getUserByEmail(email);
    } catch (err) {
      if (err instanceof NotFoundError) return { success: true };
      throw err;
    }
    if (user.verified) {
      return { success: true };
    }
    return await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        const codeObj = await this.getRepo().addPasswordResetCode(user.id, trx);
        const code = codeObj?.password_reset_code;

        await this.mailService.enqueueMail(
          {
            to: email,
            tenant_id: user.tenant_id ? String(user.tenant_id) : null,
            subject: 'Verify Your Email - CampaignRaven',
            text: `Please verify your email by clicking this link: ${env.appUrl}/verify-email?code=${code}`,
            html: `<h2>Verify Your Email</h2>
<p>To verify your email address and activate your login, please click the button below:</p>
<div class="btn-container">
  <a href="${env.appUrl}/verify-email?code=${code}" class="btn">Verify Email Address</a>
</div>
<p class="warning">For security reasons, this link will expire in 24 hours.</p>`,
          },
          trx,
        );
        return { success: true };
      });
  }

  public async resetPassword(plaintextPassword: string, code: string) {
    await this.validateNewPassword(plaintextPassword);
    const password = await hashPassword(plaintextPassword);

    const user = await this.getRepo()
      .db.selectFrom('authusers')
      .select(['email', 'first_name', 'tenant_id'])
      .where('password_reset_code', '=', hashToken(code))
      .executeTakeFirst();

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset link.');
    }

    // Check if the code is valid
    const msec = await this.getCodeAge(code);
    // 15 minutes in milliseconds
    if (msec > 15 * 60 * 1000) {
      throw new BadRequestError('The code is expired. Please request a new code');
    }

    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        // Invalidate all active sessions for this user
        const u = await trx
          .selectFrom('authusers')
          .select('id')
          .where('password_reset_code', '=', hashToken(code))
          .executeTakeFirst();
        if (u) {
          await trx.deleteFrom('sessions').where('user_id', '=', u.id).execute();
        }

        const result = await this.getRepo().updatePassword(password, code, trx);
        if (result.numUpdatedRows === BigInt(0)) {
          throw new UnauthorizedError();
        }

        await this.mailService.enqueueMail(
          {
            to: user.email,
            tenant_id: user.tenant_id ? String(user.tenant_id) : null,
            subject: 'Security Alert: Password Changed',
            text: `Hi ${user.first_name},\n\nThis is a confirmation that the password for your CampaignRaven account was recently changed. If you did not make this change, please contact support immediately.`,
            html: `<p>Hi ${user.first_name},</p><p>This is a confirmation that the password for your CampaignRaven account was recently changed.</p><p>If you did not make this change, please contact support immediately.</p>`,
          },
          trx,
        );
      });
  }

  public async resumeTenant(auth: IAuthKeyPayload) {
    const db = this.getRepo().db;

    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'paused_at'])
      .where('id', '=', auth.tenant_id)
      .executeTakeFirst();

    if (!tenant) throw new NotFoundError('Tenant not found');
    if (!tenant.paused_at) throw new BadRequestError('Account is not paused.');

    const ownerEmail = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', auth.tenant_id)
      .where('role', '=', 'owner')
      .executeTakeFirst();

    await db.updateTable('tenants').set({ paused_at: null }).where('id', '=', auth.tenant_id).execute();

    if (ownerEmail?.email) {
      await this.mailService.sendMail({
        to: ownerEmail.email,
        tenant_id: String(auth.tenant_id),
        subject: 'Your account has been reactivated',
        text: `Hi ${ownerEmail.first_name},\n\nYour account has been successfully reactivated. Welcome back!`,
        html: `<h2>Account Reactivated</h2>
<p>Hi ${ownerEmail.first_name},</p>
<p>Your account has been successfully reactivated. Everything is back to normal — welcome back!</p>`,
      });
    }

    return { success: true };
  }

  public async scheduleAccountDeletion(auth: IAuthKeyPayload) {
    const repo = this.getRepo();
    const user = await repo.getOneBy('id', { tenant_id: auth.tenant_id, value: auth.user_id });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await repo.transaction().execute(async (trx) => {
      await trx
        .updateTable('authusers')
        .set({ deletion_scheduled_at: deletionDate })
        .where('id', '=', authUser.id)
        .execute();

      await this.ensureAtLeastOneOwner(auth.tenant_id, trx, false, String(authUser.id));

      await this.mailService.enqueueMail(
        {
          to: authUser.email,
          tenant_id: auth.tenant_id,
          subject: 'Security Alert: Account Scheduled for Deletion',
          text: `Hi ${authUser.first_name},\n\nYour account has been scheduled for deletion on ${deletionDate.toLocaleDateString()}.\n\nIf this was a mistake, you can cancel the deletion at any time before this date by logging back in.`,
          html: `<h2>Account Scheduled for Deletion</h2>
<p>Hi ${authUser.first_name},</p>
<p>As requested, your CampaignRaven account has been scheduled for permanent deletion on <strong>${deletionDate.toLocaleDateString()}</strong>.</p>
<p>All of your data will be permanently removed. If you change your mind, you can cancel this request at any time before the deletion date by simply logging back in.</p>
<p class="warning">If you did not make this request, please log in immediately to cancel the deletion and secure your account.</p>`,
        },
        trx,
      );
    });

    return { success: true, deletion_scheduled_at: deletionDate };
  }

  public async scheduleTenantDeletion(auth: IAuthKeyPayload) {
    const db = this.getRepo().db;

    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'name', 'deletion_scheduled_at'])
      .where('id', '=', auth.tenant_id)
      .executeTakeFirst();

    if (!tenant) throw new NotFoundError('Tenant not found');
    if (tenant.deletion_scheduled_at) throw new BadRequestError('Account deletion is already scheduled.');

    const ownerEmail = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', auth.tenant_id)
      .where('role', '=', 'owner')
      .executeTakeFirst();

    const deletionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const cancelToken = this.makeDeletionCancelToken(String(auth.tenant_id));
    const cancelUrl = `${env.appUrl}/cancel-deletion?tid=${auth.tenant_id}&token=${cancelToken}`;
    const deletionDateStr = deletionDate.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('tenants')
        .set({ deletion_scheduled_at: deletionDate })
        .where('id', '=', auth.tenant_id)
        .execute();

      // Invalidate every active session for the tenant so all users are signed out immediately
      await trx.deleteFrom('sessions').where('tenant_id', '=', auth.tenant_id).execute();

      if (ownerEmail?.email) {
        await this.mailService.enqueueMail(
          {
            to: ownerEmail.email,
            tenant_id: String(auth.tenant_id),
            subject: 'Your account is scheduled for deletion in 24 hours',
            text: `Hi ${ownerEmail.first_name},\n\nYour organization account has been scheduled for permanent deletion. All data will be permanently removed on ${deletionDateStr}.\n\nChanged your mind? You have 24 hours to cancel:\n${cancelUrl}\n\nAfter that, all data will be permanently removed and cannot be recovered.`,
            html: `<h2>Account Scheduled for Deletion</h2>
<p>Hi ${ownerEmail.first_name},</p>
<p>Your organization account has been scheduled for permanent deletion on <strong>${deletionDateStr}</strong>. All data associated with your account — contacts, emails, campaigns, and everything else — will be permanently and irreversibly removed.</p>
<p><strong>Changed your mind?</strong> You have 24 hours to cancel this request:</p>
<p><a href="${cancelUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Cancel Account Deletion</a></p>
<p class="warning">After the 24-hour window, all data will be permanently deleted and cannot be recovered.</p>`,
          },
          trx,
        );
      }
    });

    return { success: true };
  }

  public async sendPasswordResetEmail(email: string) {
    // Never reveal whether an account exists: return success uniformly so an
    // attacker cannot enumerate registered emails via this endpoint.
    let user: AuthUsersType;
    try {
      user = await this.getUserByEmail(email);
    } catch (err) {
      if (err instanceof NotFoundError) return true;
      throw err;
    }
    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        const codeObj = await this.getRepo().addPasswordResetCode(user.id, trx);
        const code = codeObj?.password_reset_code;

        // send the reset email
        await this.mailService.enqueueMail(
          {
            to: email,
            tenant_id: user.tenant_id ? String(user.tenant_id) : null,
            subject: 'Reset Your Password',
            text: `Hey there, please click this link to reset your password: ${env.appUrl}/new-password?code=${code}`,
            html: `<h2>Reset Your Password</h2>
<p>We received a request to reset the password for your CampaignRaven account. Click the button below to choose a new password:</p>
<div class="btn-container">
  <a href="${env.appUrl}/new-password?code=${code}" class="btn">Reset Password</a>
</div>
<p>If you did not request a password reset, no further action is required.</p>
<p class="warning">This reset link is single-use and will expire in 15 minutes.</p>`,
          },
          trx,
        );
      });
    return true;
  }

  public async signIn(input: signInInputType, ipAddress?: string, userAgent?: string) {
    const user = await this.getUserByEmail(input.email.toLowerCase());

    const valid = await verifyPassword(input.password, user.password);
    if (!valid) {
      throw new UnauthorizedError();
    }

    if (!user.verified) {
      throw new ForbiddenError(
        'Your email address is not verified yet. Please check your inbox (and spam folder) for a verification link.',
      );
    }

    // Tenant-wide MFA enforcement: when enabled, every user gets the email-OTP challenge on a new
    // device/location, even if they never individually enabled two-factor auth.
    const tenantMfaRequired = (await this.getTenantSetting(user.tenant_id, 'access.mfa_required')) === true;
    const requires2FA =
      (user.two_factor_enabled || tenantMfaRequired) &&
      (await this.isNewDeviceOrLocation(String(user.id), ipAddress, userAgent));

    if (requires2FA) {
      const otpCode = randomInt(100000, 1000000).toString();
      await this.getRepo()
        .db.updateTable('authusers')
        .set({
          // Store only the hash; the plaintext OTP is emailed to the user.
          two_factor_code: hashToken(otpCode),
          two_factor_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        })
        .where('id', '=', user.id)
        .execute();

      await this.mailService.sendMail({
        to: user.email,
        tenant_id: user.tenant_id ? String(user.tenant_id) : null,
        subject: 'Login Verification (2FA) Code',
        text: `Your login verification code is ${otpCode}. It expires in 5 minutes.`,
        html: `<h2>Login Verification Code</h2>
<p>Use the 6-digit one-time passcode (OTP) below to verify your login attempt. This passcode is valid for 5 minutes.</p>
<div class="otp-container">
  <span class="otp-code">${otpCode}</span>
</div>
<p class="warning">If you did not attempt to log in, please secure your account immediately.</p>`,
      });

      return { requires2FA: true, email: user.email };
    }

    if (user.deletion_scheduled_at) {
      await this.getRepo()
        .db.updateTable('authusers')
        .set({ deletion_scheduled_at: null })
        .where('id', '=', user.id)
        .execute();

      await this.mailService.sendMail({
        to: user.email,
        tenant_id: user.tenant_id ? String(user.tenant_id) : null,
        subject: 'CampaignRaven - Account Restored',
        text: `Welcome back! Your request to delete your account has been successfully canceled, and your account is fully restored.`,
        html: `<h2>Account Restored</h2>
<p>Welcome back! Your request to delete your account has been successfully canceled, and your account is fully restored.</p>`,
      });
    }

    if (user.tenant_id) {
      const tenant = await this.getRepo()
        .db.selectFrom('tenants')
        .select(['suspended_at', 'paused_at'])
        .where('id', '=', user.tenant_id)
        .executeTakeFirst();

      if (tenant?.suspended_at) {
        throw new ForbiddenError(
          'This account has been suspended. Please contact support if you believe this is an error.',
        );
      }
      // Paused accounts (user-initiated) allow login so the owner can reactivate from settings
    }

    return this.createTokens({
      user_id: String(user.id),
      tenant_id: String(user.tenant_id),
      name: user.first_name,
      ipAddress,
      userAgent,
      rememberMe: input.rememberMe,
    });
  }

  public async signOut(auth: IAuthKeyPayload | null) {
    if (!auth?.session_id) {
      return null;
    }
    return this.sessions.deleteBySessionId(auth.session_id);
  }

  public async signUp(input: signUpInputType): Promise<IToken> {
    const email = input.email.toLowerCase();
    let token = { auth_token: '', refresh_token: '' };

    try {
      await this.verifyUserDoesNotExist(email);
      await this.validateNewPassword(input.password);
      const password = await hashPassword(input.password);

      await this.tenants.transaction().execute(async (trx) => {
        const tenant_id = await this.createTenant(trx, input.organization);
        const user = await this.createUser(trx, tenant_id, password, email, input);
        const userId = String(user.id);
        const profile = await this.createProfile(trx, user.id, tenant_id, user.id);
        await this.updateTenantWithAdmin(trx, tenant_id, user.id, user.id);
        await this.tagsRepo.ensureSystemTags({ tenant_id, user_id: userId }, trx);

        // Create a default campaign for the new tenant
        const campaign = await trx
          .insertInto('campaigns')
          .values({
            tenant_id,
            admin_id: user.id,
            createdby_id: user.id,
            updatedby_id: user.id,
            name: `${input.organization} Campaign`,
          })
          .returning('id')
          .executeTakeFirstOrThrow();

        // Create default settings (current_campaign and notifications)
        await trx
          .insertInto('settings')
          .values([
            {
              tenant_id,
              key: 'current_campaign',
              value: { id: Number(campaign.id) },
              createdby_id: user.id,
              updatedby_id: user.id,
            },
            {
              tenant_id,
              key: 'notifications',
              value: false,
              createdby_id: user.id,
              updatedby_id: user.id,
            },
          ])
          .execute();

        // Create the tenant's permanent placeholder household and store its ID on
        // the tenant so it can be quickly identified without scanning all households.
        const placeholderHousehold = await trx
          .insertInto('households')
          .values({
            tenant_id,
            campaign_id: campaign.id,
            createdby_id: user.id,
            updatedby_id: user.id,
          })
          .returning('id')
          .executeTakeFirstOrThrow();

        await trx
          .updateTable('tenants')
          .set({ placeholder_household_id: placeholderHousehold.id })
          .where('id', '=', tenant_id)
          .execute();

        await seedOnboardingData({ tenant_id, user_id: userId, campaign_id: campaign.id }, trx);

        const codeObj = await this.getRepo().addPasswordResetCode(user.id, trx);
        const verificationCode = codeObj?.password_reset_code;
        await this.mailService.enqueueMail(
          {
            to: email,
            tenant_id,
            subject: 'Welcome to CampaignRaven - Verify Your Email',
            text: `Welcome to CampaignRaven! Please verify your email by clicking this link: ${env.appUrl}/verify-email?code=${verificationCode}`,
            html: `<h2>Verify Your Email</h2>
<p>Welcome to CampaignRaven! To activate your account and complete your sign-up, please verify your email address by clicking the link below:</p>
<div class="btn-container">
  <a href="${env.appUrl}/verify-email?code=${verificationCode}" class="btn">Verify Email Address</a>
</div>
<p class="warning">For security reasons, this link will expire in 24 hours.</p>`,
          },
          trx,
        );

        token = await this.createTokens(
          {
            user_id: profile.id,
            tenant_id: user.tenant_id,
            name: user.first_name,
          },
          trx,
        );
      });

      return token;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new InternalError('Something went wrong, please try again', undefined, { cause: err });
    }
  }

  public async updateUser(auth: IAuthKeyPayload, id: string, data: UpdateAuthUserType) {
    const userId = String(id);
    const callerRole = auth.role;

    if (callerRole === 'user' && userId !== auth.user_id) {
      throw new ForbiddenError('You do not have permission to update other users.');
    }

    const existing = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: userId });
    if (!existing) throw new NotFoundError('User not found');
    const existingUser = existing as AuthUsersType;

    if (callerRole === 'user') {
      if (data.role !== undefined && data.role !== existingUser.role) {
        throw new ForbiddenError('You do not have permission to change roles.');
      }
    }

    if (callerRole === 'admin') {
      if (existingUser.role === 'owner') {
        if (data.role !== undefined && data.role !== 'owner') {
          throw new ForbiddenError('Admins cannot demote an owner.');
        }
      } else {
        if (data.role === 'owner') {
          throw new ForbiddenError('Admins cannot promote a non-owner to an owner.');
        }
      }
    }

    if (data.verified !== undefined && Boolean(data.verified) !== Boolean(existingUser.verified)) {
      throw new ForbiddenError('Verification status cannot be changed manually.');
    }

    const row: Record<string, unknown> = {};

    const isOwnEmailChange =
      data.email && data.email.toLowerCase() !== existingUser.email.toLowerCase() && userId === auth.user_id;

    if (data.email) {
      const nextEmail = data.email.toLowerCase();
      if (nextEmail !== existingUser.email.toLowerCase()) {
        const other = await this.getRepo().getByEmail(nextEmail, { columns: ['id'] });
        const otherUser = other as AuthUsersType | undefined;
        if (otherUser && String(otherUser.id) !== userId) {
          throw new ConflictError('Email already exists');
        }
        row['email'] = nextEmail;
        row['verified'] = false;

        if (isOwnEmailChange) {
          row['previous_email'] = existingUser.email;
          row['previous_role'] = existingUser.role;
          row['role'] = 'viewer';
        }
      }
    }
    if (data.first_name !== undefined) row['first_name'] = data.first_name;
    if (data.last_name !== undefined) row['last_name'] = data.last_name ?? '';
    if (data.role !== undefined) row['role'] = data.role ?? null;
    if (data.verified !== undefined) row['verified'] = data.verified;
    if (data.two_factor_enabled !== undefined) row['two_factor_enabled'] = data.two_factor_enabled;
    if (Object.keys(row).length > 0) {
      row['updated_at'] = new Date();
      row['updatedby_id'] = auth.user_id;
    }

    let updated = existingUser;
    if (Object.keys(row).length > 0) {
      updated = await this.getRepo()
        .transaction()
        .execute(async (trx) => {
          const result = await this.getRepo().update(
            {
              tenant_id: auth.tenant_id,
              id: userId,
              row: row as OperationDataType<'authusers', 'update'>,
            },
            trx,
          );
          if (!result) throw new InternalError('Update failed');
          const updatedUser = result as unknown as AuthUsersType;

          await this.ensureAtLeastOneOwner(auth.tenant_id, trx, true, userId);

          if (row['email']) {
            const oldEmail = existingUser.email;
            const nextEmail = row['email'];

            const codeObj = await this.getRepo().addPasswordResetCode(userId, trx);
            const code = codeObj?.password_reset_code;

            if (!isOwnEmailChange) {
              await this.sessions.deleteByUserId(userId, auth.tenant_id, trx);
            }

            await this.mailService.enqueueMail(
              {
                to: nextEmail as string,
                tenant_id: auth.tenant_id,
                subject: 'Verify Your New Email Address - CampaignRaven',
                text: `Please verify your new email address by clicking this link: ${env.appUrl}/verify-email?code=${code}`,
                html: `<h2>Verify Your New Email</h2>
<p>Please verify your new email address to complete the update and activate your login:</p>
<div class="btn-container">
  <a href="${env.appUrl}/verify-email?code=${code}" class="btn">Verify Email Address</a>
</div>
<p class="warning">This verification link will expire in 24 hours.</p>`,
              },
              trx,
            );

            await this.mailService.enqueueMail(
              {
                to: oldEmail,
                tenant_id: auth.tenant_id,
                subject: 'Security Alert: Email Address Update Initiated',
                text: `Hi ${existingUser.first_name},\n\nThe email address for your CampaignRaven account has been requested to change to ${nextEmail}. If you did not make this change, please contact support immediately.`,
                html: `<h2>Security Alert: Email Change</h2>
<p>Hi ${existingUser.first_name},</p>
<p>The email address for your CampaignRaven account was recently changed to <strong>${nextEmail}</strong>.</p>
<p>We have sent a verification link to the new address. Until it is verified, login under that address is inactive.</p>
<p class="warning">If you did not make this change, please contact support immediately to secure your account.</p>`,
              },
              trx,
            );
          }

          const skipKeys = ['id', 'tenant_id', 'createdby_id', 'updatedby_id', 'created_at', 'updated_at', 'password'];
          const changes: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            if (skipKeys.includes(key)) continue;
            const oldVal = (existingUser as Record<string, unknown>)[key];
            const newVal = (row as Record<string, unknown>)[key];
            if (oldVal !== newVal) {
              changes[key] = { from: oldVal ?? null, to: newVal ?? null };
            }
          }
          await this.userActivity.log(
            {
              tenant_id: auth.tenant_id,
              user_id: auth.user_id,
              activity: 'update',
              entity: 'authusers',
              entity_id: userId,
              quantity: 1,
              metadata: {
                id: userId,
                entity_label: `${updatedUser.first_name} ${updatedUser.last_name || ''}`.trim(),
                changes,
              },
            },
            trx,
          );

          return updatedUser;
        });
    }

    await this.syncProfile(auth, userId, data);
    const profile = (await this.profiles.getOneByAuthId(userId)) as Models['profiles'] | undefined;
    return this.sanitizeUser({ ...updated, profile });
  }

  public async uploadAvatar(auth: IAuthKeyPayload, input: { dataBase64: string; mimeType: string; filename: string }) {
    const { dataBase64, mimeType, filename } = input;

    if (!AuthController.AVATAR_ALLOWED_TYPES.includes(mimeType)) {
      throw new BadRequestError(`Unsupported image type. Allowed: ${AuthController.AVATAR_ALLOWED_TYPES.join(', ')}`);
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > AuthController.AVATAR_MAX_BYTES) {
      throw new BadRequestError('File too large. Maximum size is 5 MB.');
    }

    const storageFileUUID = randomUUID();
    const ext = mimeType.split('/')[1] || 'jpg';
    const storageKey = `avatars/${auth.tenant_id}/${auth.user_id}/${storageFileUUID}.${ext}`;
    const sha256_hex = createHash('sha256').update(buffer).digest('hex');

    await this.storage.upload(storageKey, buffer, mimeType);

    let finalFileId = '';

    await this.getRepo()
      .db.transaction()
      .execute(async (trx) => {
        const existingProfile = await this.profiles.getOneByAuthId(auth.user_id);

        // Clean up old avatar
        if (existingProfile?.avatar_file_id) {
          try {
            const oldFile = await trx
              .selectFrom('files')
              .select('storage_key')
              .where('tenant_id', '=', auth.tenant_id)
              .where('id', '=', existingProfile.avatar_file_id)
              .executeTakeFirst();
            if (oldFile?.storage_key) await this.storage.delete(oldFile.storage_key);
            await trx
              .deleteFrom('files')
              .where('tenant_id', '=', auth.tenant_id)
              .where('id', '=', existingProfile.avatar_file_id)
              .execute();
          } catch {
            /* non-critical */
          }
        }

        // Insert new file record
        const fileResult = await trx
          .insertInto('files')
          .values({
            tenant_id: auth.tenant_id,
            filename,
            mime_type: mimeType,
            size_bytes: buffer.length,
            storage_key: storageKey,
            sha256_hex,
            uploaded_by: auth.user_id,
          })
          .returning('id')
          .executeTakeFirstOrThrow();

        const fileId = String(fileResult.id);
        finalFileId = fileId;

        // Update or insert profile
        if (existingProfile) {
          await trx
            .updateTable('profiles')
            .set({ avatar_file_id: fileId, updated_at: new Date(), updatedby_id: auth.user_id })
            .where('tenant_id', '=', auth.tenant_id)
            .where('auth_id', '=', auth.user_id)
            .execute();
        } else {
          await trx
            .insertInto('profiles')
            .values({
              tenant_id: auth.tenant_id,
              auth_id: auth.user_id,
              avatar_file_id: fileId,
              createdby_id: auth.user_id,
              updatedby_id: auth.user_id,
            })
            .execute();
        }
      });

    return { file_id: finalFileId, avatar_url: `/api/files/download/${finalFileId}` };
  }

  public async verify2FA(email: string, code: string, ipAddress?: string, userAgent?: string, rememberMe?: boolean) {
    const user = await this.getUserByEmail(email.toLowerCase());

    // The OTP is stored hashed; hash the input and compare with a timing-safe
    // equality to eliminate the brute-force side-channel.
    const storedCode = user.two_factor_code ?? '';
    const inputHash = code ? hashToken(String(code)) : '';
    const codeMatch =
      storedCode.length > 0 &&
      storedCode.length === inputHash.length &&
      timingSafeEqual(Buffer.from(storedCode), Buffer.from(inputHash));
    if (!codeMatch) {
      throw new BadRequestError('Invalid verification code.');
    }

    if (!user.verified) {
      throw new ForbiddenError(
        'Your email address is not verified yet. Please check your inbox (and spam folder) for a verification link.',
      );
    }

    if (!user.two_factor_expires_at || (user.two_factor_expires_at as unknown as Date).getTime() < Date.now()) {
      throw new BadRequestError('Verification code has expired. Please log in again.');
    }

    await this.getRepo()
      .db.updateTable('authusers')
      .set({
        two_factor_code: null,
        two_factor_expires_at: null,
      })
      .where('id', '=', user.id)
      .execute();

    if (user.deletion_scheduled_at) {
      await this.getRepo()
        .db.updateTable('authusers')
        .set({ deletion_scheduled_at: null })
        .where('id', '=', user.id)
        .execute();

      await this.mailService.sendMail({
        to: user.email,
        tenant_id: user.tenant_id ? String(user.tenant_id) : null,
        subject: 'CampaignRaven - Account Restored',
        text: `Welcome back! Your request to delete your account has been successfully canceled, and your account is fully restored.`,
        html: `<h2>Account Restored</h2>
<p>Welcome back! Your request to delete your account has been successfully canceled, and your account is fully restored.</p>`,
      });
    }

    if (user.tenant_id) {
      const tenant = await this.getRepo()
        .db.selectFrom('tenants')
        .select(['suspended_at', 'paused_at'])
        .where('id', '=', user.tenant_id)
        .executeTakeFirst();

      if (tenant?.suspended_at) {
        throw new ForbiddenError(
          'This account has been suspended. Please contact support if you believe this is an error.',
        );
      }
      // Paused accounts (user-initiated) allow login so the owner can reactivate from settings
    }

    return this.createTokens({
      user_id: String(user.id),
      tenant_id: String(user.tenant_id),
      name: user.first_name,
      ipAddress,
      userAgent,
      rememberMe,
    });
  }

  public async verifyEmail(code: string) {
    const msec = await this.getCodeAge(code);
    // 24 hours in milliseconds for verification links
    if (msec > 24 * 60 * 60 * 1000) {
      throw new BadRequestError('The verification link has expired. Please request a new one.');
    }

    const repo = this.getRepo();
    const user = await repo.db
      .selectFrom('authusers')
      .select(['id', 'previous_email', 'previous_role'])
      .where('password_reset_code', '=', hashToken(code))
      .executeTakeFirst();

    if (!user) {
      throw new BadRequestError('Invalid or expired verification link.');
    }

    await repo.transaction().execute(async (trx) => {
      const updateData: Record<string, unknown> = {
        verified: true,
        password_reset_code: null,
        password_reset_code_created_at: null,
      };

      if (user.previous_email) {
        // Email change confirmation: restore role and clear pending state.
        // Invalidate all existing sessions — an old-email session token
        // should not remain valid after the address has been changed.
        updateData['role'] = user.previous_role;
        updateData['previous_email'] = null;
        updateData['previous_role'] = null;
        await trx.deleteFrom('sessions').where('user_id', '=', user.id).execute();
      }

      await trx.updateTable('authusers').set(updateData).where('id', '=', user.id).execute();
    });

    return { success: true };
  }

  private async buildUserStats(auth: IAuthKeyPayload, userId: string) {
    const defaults = {
      emails_assigned: { total: 0, open: 0, closed: 0 },
      contacts_added: { total: 0, last_created_at: null as Date | null },
      files_imported: { count: 0, total_rows: 0, last_activity_at: null as Date | null },
      files_exported: { count: 0, total_rows: 0, last_activity_at: null as Date | null },
    };

    try {
      const [emails, contacts, activity] = await Promise.all([
        this.emailsRepo.getAssignmentStats({ tenant_id: auth.tenant_id, user_id: userId }),
        this.personsRepo.getCreatedStats({ tenant_id: auth.tenant_id, user_id: userId }),
        this.userActivity.getStats({ tenant_id: auth.tenant_id, user_id: userId }),
      ]);

      const importActivity = activity['import'] ?? { count: 0, total_quantity: 0, last_activity_at: null };
      const exportActivity = activity['export'] ?? { count: 0, total_quantity: 0, last_activity_at: null };

      return {
        emails_assigned: emails,
        contacts_added: contacts,
        files_imported: {
          count: importActivity.count ?? 0,
          total_rows: importActivity.total_quantity ?? 0,
          last_activity_at: importActivity.last_activity_at ?? null,
        },
        files_exported: {
          count: exportActivity.count ?? 0,
          total_rows: exportActivity.total_quantity ?? 0,
          last_activity_at: exportActivity.last_activity_at ?? null,
        },
      };
    } catch (err) {
      logger.error({ err }, 'Failed to build user stats');
      return defaults;
    }
  }

  private coerceBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
    return false;
  }

  private coerceDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private async createProfile(trx: Transaction<Models>, id: string, tenant_id: string, auth_id: string) {
    const row = { id, tenant_id, auth_id } as OperationDataType<'profiles', 'insert'>;
    const profile = await this.profiles.add({ row }, trx);
    if (!profile) {
      throw new InternalError('Something went wrong, please try again');
    }
    return profile;
  }

  private async createTenant(trx: Transaction<Models>, name: string) {
    const row = { name } as OperationDataType<'tenants', 'insert'>;
    const tenantAddResult = await this.tenants.add({ row }, trx);
    if (!tenantAddResult) {
      throw new InternalError('Something went wrong, please try again');
    }
    return tenantAddResult.id;
  }

  private async createTokens(
    input: {
      user_id: string;
      tenant_id: string;
      name: string;
      oldSession?: string;
      ipAddress?: string;
      userAgent?: string;
      rememberMe?: boolean;
      existingExpiresAt?: Date | null;
    },
    trx?: Transaction<Models>,
  ) {
    // Delete the old session
    if (input.oldSession) await this.sessions.deleteBySessionId(input.oldSession, trx);

    // Generate plaintext tokens — only their hashes are persisted in the DB.
    const plainSessionId = generateToken();
    const plainRefreshToken = generateToken();

    const now = new Date();
    const expiresAt =
      input.existingExpiresAt !== undefined
        ? input.existingExpiresAt // renewal: preserve original absolute expiry
        : new Date(now.getTime() + (input.rememberMe ? REMEMBER_ME_EXPIRY_MS : SESSION_EXPIRY_MS));

    const row = {
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      ip_address: input.ipAddress || '',
      user_agent: input.userAgent || '',
      status: 'active',
      session_id: hashToken(plainSessionId),
      refresh_token: hashToken(plainRefreshToken),
      expires_at: expiresAt,
      last_used_at: now,
    } as OperationDataType<'sessions', 'insert'>;

    const currentSession = await this.sessions.add({ row }, trx);

    if (!currentSession) {
      throw new InternalError('Session creation failed');
    }

    const key = process.env['SHARED_SECRET'];
    if (!key) {
      throw new ServerMisconfigError('Server misconfiguration');
    }

    const signer = createSigner({
      algorithm: 'HS256',
      key,
      expiresIn: '30m',
    });
    try {
      const auth_token = signer({
        user_id: input.user_id,
        tenant_id: input.tenant_id,
        name: input.name,
        session_id: plainSessionId, // plaintext in JWT; hash is in DB
      });
      return { auth_token, refresh_token: plainRefreshToken }; // plaintext to client
    } catch (err) {
      throw new InternalError('Token creation failed', undefined, { cause: err });
    }
  }

  private async createUser(
    trx: Transaction<Models>,
    tenant_id: string,
    password: string,
    email: string,
    input: {
      email: string;
      first_name: string;
      password: string;
      organization: string;
    },
  ) {
    const row = {
      tenant_id,
      password,
      email,
      first_name: input.first_name,
      role: 'owner',
      verified: false,
    } as OperationDataType<'authusers', 'insert'>;
    try {
      const user = await this.getRepo().add({ row }, trx);
      if (!user) throw new InternalError('Something went wrong, please try again');
      return user;
    } catch (err) {
      throw new InternalError('Something went wrong, please try again', undefined, { cause: err });
    }
  }

  private generateTempPassword(length = 18) {
    return randomBytes(Math.max(12, Math.ceil(length / 2)))
      .toString('base64url')
      .slice(0, length);
  }

  /** Reads a single tenant configuration value from the settings key/value table. */
  private async getTenantSetting(tenant_id: string | number | null | undefined, key: string): Promise<unknown> {
    if (tenant_id === null || tenant_id === undefined) return undefined;
    const row = await this.getRepo()
      .db.selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', String(tenant_id))
      .where('key', '=', key)
      .executeTakeFirst();
    return row?.value;
  }

  private async getCodeAge(code: string): Promise<number> {
    const nowData: QueryResult<INow> = await this.getRepo().nowTime();
    if (!nowData || !nowData?.rows[0]?.now) {
      throw new InternalError('Something went wrong, please try again');
    }

    const data: AuthUsersType = (await this.getRepo().getPasswordResetCodeTime(code)) as AuthUsersType;
    if (!data) {
      throw new PreconditionFailedError('Invalid password reset code');
    }
    const thenTimestamp = (data.password_reset_code_created_at || new Date().toString()) as string;
    const then = new Date(thenTimestamp);

    const now = new Date(nowData?.rows[0]?.now || new Date().toString());

    return now.getTime() - then.getTime();
  }

  private async getUserByEmail(email: string) {
    const user = (await this.getRepo().getByEmail(email)) as AuthUsersType;

    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  private async isNewDeviceOrLocation(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    // Fail closed: if the client IP can't be determined, treat it as a new
    // device so the 2FA challenge is issued rather than silently skipped.
    if (!ipAddress) return true;
    const existing = await this.sessions.db
      .selectFrom('sessions')
      .select('id')
      .where('user_id', '=', userId)
      .where('ip_address', '=', ipAddress)
      .where('user_agent', '=', userAgent || '')
      .where('status', '=', 'active')
      .executeTakeFirst();
    return !existing;
  }

  private sanitizeUser(record: Record<string, unknown>) {
    const lastName: string =
      (record['last_name'] as string | null | undefined) ??
      (record['profile_last_name'] as string | null | undefined) ??
      (record['effective_last_name'] as string | null | undefined) ??
      ((record['profile'] as Record<string, unknown>)?.['last_name'] as string | null | undefined) ??
      '';

    let notificationPreferences = {
      mention_in_comment: true,
      mention_in_comment_in_app: true,
      task_assigned: true,
      task_assigned_in_app: true,
      task_due: true,
      task_due_in_app: true,
      person_assigned: true,
      person_assigned_in_app: true,
      export_ready: true,
      export_ready_in_app: true,
      import_summary: true,
      import_summary_in_app: true,
    };

    const profileJson = (record['profile'] as Record<string, unknown>)?.['json'] ?? record['json'];
    if (profileJson) {
      try {
        const parsed = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
        if (parsed && typeof parsed === 'object' && parsed.notifications) {
          notificationPreferences = {
            ...notificationPreferences,
            ...parsed.notifications,
          };
        }
      } catch (e) {
        logger.error({ err: e }, 'Failed to parse profile json for preferences');
      }
    }

    return {
      id: record['id'] != null ? String(record['id']) : '',
      email: (record['email'] as string | null | undefined) ?? '',
      first_name: (record['first_name'] as string | null | undefined) ?? '',
      last_name: lastName,
      role: record['role'] != null ? String(record['role']) : null,
      verified: this.coerceBoolean(record['verified']),
      email_verified: this.coerceBoolean(record['verified']),
      two_factor_enabled: this.coerceBoolean(record['two_factor_enabled']),
      deletion_scheduled_at: this.coerceDate(record['deletion_scheduled_at']),
      created_at: this.coerceDate(record['created_at']),
      updated_at: this.coerceDate(record['updated_at']),
      previous_email: (record['previous_email'] as string | null | undefined) ?? null,
      previous_role: (record['previous_role'] as string | null | undefined) ?? null,
      notification_preferences: notificationPreferences,
    };
  }

  private async syncProfile(auth: IAuthKeyPayload, authUserId: string, data: UpdateAuthUserType) {
    const existingProfile = (await this.profiles.getOneByAuthId(authUserId)) as Models['profiles'] | undefined;
    const profileId = existingProfile?.id != null ? String(existingProfile.id) : authUserId;

    let finalJson: Record<string, unknown> | null = null;
    if (existingProfile?.json) {
      try {
        finalJson = typeof existingProfile.json === 'string' ? JSON.parse(existingProfile.json) : existingProfile.json;
      } catch (e) {
        logger.error({ err: e }, 'Failed to parse existing profile json');
      }
    }

    if (data.notification_preferences) {
      finalJson = {
        ...(finalJson || {}),
        notifications: {
          ...(((finalJson || {})['notifications'] as Record<string, unknown>) || {}),
          ...data.notification_preferences,
        },
      };
    }

    if (existingProfile) {
      const row: Record<string, unknown> = {
        updatedby_id: auth.user_id,
        updated_at: new Date(),
      };
      if (data.last_name !== undefined) {
        row['last_name'] = data.last_name ?? null;
      }
      if (finalJson !== null) {
        row['json'] = JSON.stringify(finalJson);
      }

      if (data.last_name !== undefined || data.notification_preferences !== undefined) {
        await this.profiles.update({ tenant_id: auth.tenant_id, id: profileId, row });
      }
      return;
    }

    const insertRow = {
      id: authUserId,
      tenant_id: auth.tenant_id,
      auth_id: authUserId,
      last_name: data.last_name ?? null,
      json: finalJson ? JSON.stringify(finalJson) : null,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'profiles', 'insert'>;
    await this.profiles.add({ row: insertRow });
  }

  private async updateTenantWithAdmin(
    trx: Transaction<Models>,
    tenant_id: string,
    admin_id: string,
    createdby_id: string,
  ) {
    const row = { admin_id, createdby_id } as OperationDataType<'tenants', 'update'>;
    const id = tenant_id as GetOperandType<'tenants', 'update', Keys<TablesOperationMap['tenants']['update']>>;
    await this.tenants.update({ id, tenant_id, row }, trx);
  }

  private async validateNewPassword(password: string): Promise<void> {
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      throw new BadRequestError('This password is too common. Please choose a different password.');
    }
    const count = await getPwnedCount(password);
    if (count > 0) {
      throw new BadRequestError(
        'This password has appeared in a known data breach. Please choose a different password.',
      );
    }
  }

  private async verifyUserDoesNotExist(email: string) {
    const exists = await this.getRepo().existsByEmail(email);
    if (exists) {
      throw new ConflictError('This email already exists. Did you want to sign in?');
    }
  }
}

const IDLE_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const REMEMBER_ME_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const renewalVerifier = createVerifier({
  algorithms: ['HS256'],
  key: env.sharedSecret,
  ignoreExpiration: true,
});
