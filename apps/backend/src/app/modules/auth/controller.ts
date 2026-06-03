import * as bcrypt from 'bcrypt';

import {
  IAuthKeyPayload,
  INow,
  IToken,
  InviteAuthUserType,
  UpdateAuthUserType,
  getAllOptionsType,
  signInInputType,
  signUpInputType,
} from '@common';

import { randomBytes } from 'crypto';
import { createDecoder, createSigner } from 'fast-jwt';
import { QueryResult, Transaction } from 'kysely';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';

import {
  AppError,
  BadRequestError,
  ConflictError,
  InternalError,
  NotFoundError,
  PreconditionFailedError,
  ServerMisconfigError,
  UnauthorizedError,
} from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { QueryParams } from '../../lib/base.repo';
import { UserProfiles } from '../userprofiles/repositories/userprofiles.repo';
import { AuthUsersRepo } from './repositories/authusers.repo';
import { SessionsRepo } from './repositories/sessions.repo';
import { TenantsRepo } from './repositories/tenants.repo';
import { EmailRepo } from '../emails/repositories/email.repo';
import { PersonsRepo } from '../persons/repositories/persons.repo';
import { TagsRepo } from '../tags/repositories/tags.repo';
import {
  AuthUsersType,
  GetOperandType,
  Keys,
  Models,
  OperationDataType,
  TablesOperationMap,
} from 'common/src/lib/kysely.models';

/**
 * Controller responsible for user authentication, sign-up, token management,
 * and password reset workflows.
 */
export class AuthController extends BaseController<'authusers', AuthUsersRepo> {
  private profiles: UserProfiles = new UserProfiles();
  private sessions: SessionsRepo = new SessionsRepo();
  private tenants: TenantsRepo = new TenantsRepo();
  private emailsRepo: EmailRepo = new EmailRepo();
  private personsRepo: PersonsRepo = new PersonsRepo();
  private tagsRepo: TagsRepo = new TagsRepo();
  private mailService = new TransactionalEmailService();

  constructor() {
    super(new AuthUsersRepo());
  }

  /**
   * Fetches the currently authenticated user with limited fields.
   * @param auth Auth payload containing tenant and user ID.
   * @returns Auth user record or null if not found.
   */
  public async currentUser(auth: IAuthKeyPayload) {
    // There's no user ID, which means that the user is unauthorized
    if (!auth?.user_id) {
      throw new UnauthorizedError();
    }
    const options = {
      columns: ['id', 'email', 'first_name'],
    } as QueryParams<'authusers'>;

    try {
      const user = await this.getRepo().getOneBy('id', {
        tenant_id: auth.tenant_id,
        value: auth.user_id,
        options,
      });
      return user || null;
    } catch (err) {
      throw new InternalError('Something went wrong, please try again', undefined, { cause: err });
    }
  }

  public async getAllUsers(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    const sanitizedOptions = options ? ({ ...options, columns: undefined } as any) : undefined;
    const result = await this.getRepo().getAllWithCounts({
      tenant_id: auth.tenant_id,
      options: sanitizedOptions,
    });
    return {
      rows: result.rows.map((row) => this.sanitizeUser(row)),
      count: result.count,
    };
  }

  public async getUserById(auth: IAuthKeyPayload, id: string) {
    const record = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: id });
    if (!record) throw new NotFoundError('User not found');
    const authUser = record as AuthUsersType;
    const profile = (await this.profiles.getOneByAuthId(String(authUser.id))) as Models['profiles'] | undefined;
    const stats = await this.buildUserStats(auth, String(authUser.id));
    const sanitized = this.sanitizeUser({ ...authUser, profile });
    return { ...sanitized, stats };
  }

  public async inviteUser(auth: IAuthKeyPayload, input: InviteAuthUserType) {
    const email = input.email.toLowerCase();
    await this.verifyUserDoesNotExist(email);

    const tempPassword = this.generateTempPassword();
    const password = await this.hashPassword(tempPassword);
    const repo = this.getRepo();

    const created = await repo.transaction().execute(async (trx) => {
      const row = {
        tenant_id: auth.tenant_id,
        email,
        password,
        first_name: input.first_name,
        role: input.role ?? null,
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
          text: `Hi ${input.first_name},\n\nYou have been invited to join the campaign team by ${auth.name}.\n\nYour temporary password is: ${tempPassword}\n\nActivate your account at: http://localhost:4200/new-password?code=${code}`,
          html: `<h2>You've Been Invited!</h2>
<p>Hi ${input.first_name},</p>
<p>You have been invited to join the campaign team by <strong>${auth.name}</strong>.</p>
<p>To join the team, activate your account, and set up your password, click the button below:</p>
<div class="btn-container">
  <a href="http://localhost:4200/new-password?code=${code}" class="btn">Activate Account</a>
</div>
<p>Your temporary password is: <code>${tempPassword}</code></p>
<p class="warning">If you did not expect this invitation, you can safely ignore this email.</p>`,
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
      console.error('Failed to trigger usage check in inviteUser:', err);
    }

    return this.sanitizeUser({ ...created, last_name: input.last_name });
  }

  /**
   * Renews authentication tokens using the current auth token.
   * @param input Contains `auth_token` and `refresh_token`.
   * @returns Newly generated auth and refresh tokens.
   */
  public async renewAuthToken(input: IToken) {
    if (!input?.auth_token || !input?.refresh_token) {
      throw new UnauthorizedError();
    }
    try {
      const decode = createDecoder();
      const payload = decode(input.auth_token) as any;

      // Basic payload validation before issuing new tokens
      if (!payload?.user_id || !payload?.tenant_id || !payload?.name) {
        throw new UnauthorizedError();
      }

      return this.createTokens(payload);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError();
    }
  }

  /**
   * Resets a user's password using the reset code.
   * @param plaintextPassword New password in plain text.
   * @param code Password reset verification code.
   * @throws If the reset code is expired or invalid.
   */
  public async resetPassword(plaintextPassword: string, code: string) {
    const password = await this.hashPassword(plaintextPassword);

    const user = await this.getRepo()
      .db.selectFrom('authusers')
      .select(['email', 'first_name', 'tenant_id'])
      .where('password_reset_code', '=', code)
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

  /**
   * Verifies email address based on a verification code.
   */
  public async verifyEmail(code: string) {
    const msec = await this.getCodeAge(code);
    // 24 hours in milliseconds for verification links
    if (msec > 24 * 60 * 60 * 1000) {
      throw new BadRequestError('The verification link has expired. Please request a new one.');
    }

    const result = await this.getRepo().verifyEmailByCode(code);
    if (result.numUpdatedRows === BigInt(0)) {
      throw new BadRequestError('Invalid or expired verification link.');
    }
    return { success: true };
  }

  /**
   * Resends a verification email.
   */
  public async resendVerificationEmail(email: string) {
    const user = await this.getUserByEmail(email);
    if (user.verified) {
      throw new BadRequestError('Email is already verified.');
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
            text: `Please verify your email by clicking this link: http://localhost:4200/verify-email?code=${code}`,
            html: `<h2>Verify Your Email</h2>
<p>To verify your email address and activate your login, please click the button below:</p>
<div class="btn-container">
  <a href="http://localhost:4200/verify-email?code=${code}" class="btn">Verify Email Address</a>
</div>
<p class="warning">For security reasons, this link will expire in 24 hours.</p>`,
          },
          trx,
        );
        return { success: true };
      });
  }

  /**
   * Sends a password reset email with a reset link.
   * @param email User's email address.
   * @returns Boolean indicating success.
   * @throws If email sending fails or user is not found.
   */
  public async sendPasswordResetEmail(email: string) {
    const user = await this.getUserByEmail(email);
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
            text: `Hey there, please click this link to reset your password: http://localhost:4200/new-password?code=${code}`,
            html: `<h2>Reset Your Password</h2>
<p>We received a request to reset the password for your CampaignRaven account. Click the button below to choose a new password:</p>
<div class="btn-container">
  <a href="http://localhost:4200/new-password?code=${code}" class="btn">Reset Password</a>
</div>
<p>If you did not request a password reset, no further action is required.</p>
<p class="warning">This reset link is single-use and will expire in 15 minutes.</p>`,
          },
          trx,
        );
      });
    return false;
  }

  /**
   * Authenticates a user with email and password.
   * @param input Object containing `email` and `password`.
   * @returns Newly generated auth and refresh tokens.
   * @throws If credentials are invalid.
   */
  public async signIn(input: signInInputType, ipAddress?: string, userAgent?: string) {
    const user = await this.getUserByEmail(input.email.toLowerCase());

    if (!bcrypt.compareSync(input.password, user.password)) {
      throw new UnauthorizedError();
    }

    const requires2FA =
      user.two_factor_enabled || (await this.isNewDeviceOrLocation(String(user.id), ipAddress, userAgent));

    if (requires2FA) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await this.getRepo()
        .db.updateTable('authusers')
        .set({
          two_factor_code: otpCode,
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

    return this.createTokens({
      user_id: String(user.id),
      tenant_id: String(user.tenant_id),
      name: user.first_name,
      ipAddress,
      userAgent,
    });
  }

  public async verify2FA(email: string, code: string, ipAddress?: string, userAgent?: string) {
    const user = await this.getUserByEmail(email.toLowerCase());

    if (!user.two_factor_code || user.two_factor_code !== code) {
      throw new BadRequestError('Invalid verification code.');
    }

    if (!user.two_factor_expires_at || new Date(user.two_factor_expires_at as any).getTime() < Date.now()) {
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

    return this.createTokens({
      user_id: String(user.id),
      tenant_id: String(user.tenant_id),
      name: user.first_name,
      ipAddress,
      userAgent,
    });
  }

  public async scheduleAccountDeletion(auth: IAuthKeyPayload) {
    const user = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: auth.user_id });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.getRepo()
      .db.updateTable('authusers')
      .set({ deletion_scheduled_at: deletionDate })
      .where('id', '=', authUser.id)
      .execute();

    await this.mailService.sendMail({
      to: authUser.email,
      tenant_id: auth.tenant_id,
      subject: 'Security Alert: Account Scheduled for Deletion',
      text: `Hi ${authUser.first_name},\n\nYour account has been scheduled for deletion on ${deletionDate.toLocaleDateString()}.\n\nIf this was a mistake, you can cancel the deletion at any time before this date by logging back in.`,
      html: `<h2>Account Scheduled for Deletion</h2>
<p>Hi ${authUser.first_name},</p>
<p>As requested, your CampaignRaven account has been scheduled for permanent deletion on <strong>${deletionDate.toLocaleDateString()}</strong>.</p>
<p>All of your data will be permanently removed. If you change your mind, you can cancel this request at any time before the deletion date by simply logging back in.</p>
<p class="warning">If you did not make this request, please log in immediately to cancel the deletion and secure your account.</p>`,
    });

    return { success: true, deletion_scheduled_at: deletionDate };
  }

  public async cancelAccountDeletion(auth: IAuthKeyPayload) {
    const user = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: auth.user_id });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;

    await this.getRepo()
      .db.updateTable('authusers')
      .set({ deletion_scheduled_at: null })
      .where('id', '=', authUser.id)
      .execute();

    await this.mailService.sendMail({
      to: authUser.email,
      tenant_id: auth.tenant_id,
      subject: 'CampaignRaven - Account Deletion Canceled',
      text: `Your request to delete your account has been successfully canceled, and your account is fully restored.`,
      html: `<h2>Account Deletion Canceled</h2>
<p>Your request to delete your account has been successfully canceled, and your account is fully restored. Welcome back!</p>`,
    });

    return { success: true };
  }

  public async adminTriggerPasswordReset(auth: IAuthKeyPayload, userId: string) {
    const user = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: userId });
    if (!user) throw new NotFoundError('User not found');
    const authUser = user as AuthUsersType;

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
            text: `Hi ${authUser.first_name},\n\nAn administrator has initiated a password reset for your account.\n\nPlease reset your password using the link below:\nhttp://localhost:4200/new-password?code=${code}\n\nThis link is valid for 15 minutes.`,
            html: `<h2>Password Reset Request</h2>
<p>Hi ${authUser.first_name},</p>
<p>An administrator has initiated a password reset for your account.</p>
<p>Please click the button below to reset your password and select a new one:</p>
<div class="btn-container">
  <a href="http://localhost:4200/new-password?code=${code}" class="btn">Reset Password</a>
</div>
<p class="warning">For security reasons, this reset link is single-use and will expire in 15 minutes.</p>`,
          },
          trx,
        );

        return { success: true };
      });
  }

  private async isNewDeviceOrLocation(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    if (!ipAddress) return false;
    const existing = await this.sessions.db
      .selectFrom('sessions')
      .select('id')
      .where('user_id', '=', BigInt(userId) as any)
      .where('ip_address', '=', ipAddress)
      .where('user_agent', '=', userAgent || '')
      .where('status', '=', 'active')
      .executeTakeFirst();
    return !existing;
  }

  /**
   * Signs the user out by deleting their session.
   * @param auth Auth payload containing session ID.
   * @returns Number of sessions deleted.
   */
  public async signOut(auth: IAuthKeyPayload | null) {
    if (!auth?.session_id) {
      return null;
    }
    return this.sessions.deleteBySessionId(auth.session_id);
  }

  /**
   * Registers a new user, creates tenant, and issues tokens.
   * @param input User sign-up information.
   * @returns Newly generated auth and refresh tokens.
   * @throws If email is already registered or internal error occurs.
   */
  public async signUp(input: signUpInputType): Promise<IToken> {
    const email = input.email.toLowerCase();
    let token = { auth_token: '', refresh_token: '' };

    try {
      await this.verifyUserDoesNotExist(email);
      const password = await this.hashPassword(input.password);

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
              value: { id: Number(campaign.id) } as any,
              createdby_id: user.id,
              updatedby_id: user.id,
            },
            {
              tenant_id,
              key: 'notifications',
              value: false as any,
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
            campaign_id: campaign.id as any,
            createdby_id: user.id,
            updatedby_id: user.id,
          } as any)
          .returning('id')
          .executeTakeFirstOrThrow();

        await trx
          .updateTable('tenants')
          .set({ placeholder_household_id: placeholderHousehold.id as any })
          .where('id', '=', tenant_id as any)
          .execute();

        const codeObj = await this.getRepo().addPasswordResetCode(user.id, trx);
        const verificationCode = codeObj?.password_reset_code;
        await this.mailService.enqueueMail(
          {
            to: email,
            tenant_id,
            subject: 'Welcome to CampaignRaven - Verify Your Email',
            text: `Welcome to CampaignRaven! Please verify your email by clicking this link: http://localhost:4200/verify-email?code=${verificationCode}`,
            html: `<h2>Verify Your Email</h2>
<p>Welcome to CampaignRaven! To activate your account and complete your sign-up, please verify your email address by clicking the link below:</p>
<div class="btn-container">
  <a href="http://localhost:4200/verify-email?code=${verificationCode}" class="btn">Verify Email Address</a>
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
    const existing = await this.getRepo().getOneBy('id', { tenant_id: auth.tenant_id, value: userId });
    if (!existing) throw new NotFoundError('User not found');
    const existingUser = existing as AuthUsersType;

    const row: Record<string, any> = {};

    if (data.email) {
      const nextEmail = data.email.toLowerCase();
      if (nextEmail !== existingUser.email.toLowerCase()) {
        const other = await this.getRepo().getByEmail(nextEmail as any, { columns: ['id'] as any });
        const otherUser = other as AuthUsersType | undefined;
        if (otherUser && String(otherUser.id) !== userId) {
          throw new ConflictError('Email already exists');
        }
        row['email'] = nextEmail as any;
      }
    }
    if (data.first_name !== undefined) row['first_name'] = data.first_name as any;
    if (data.last_name !== undefined) row['last_name'] = (data.last_name ?? '') as any;
    if (data.role !== undefined) row['role'] = (data.role ?? null) as any;
    if (data.verified !== undefined) row['verified'] = data.verified as any;
    if (data.two_factor_enabled !== undefined) row['two_factor_enabled'] = data.two_factor_enabled as any;
    if (Object.keys(row).length > 0) {
      row['updated_at'] = new Date() as any;
      row['updatedby_id'] = auth.user_id as any;
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

          if (row['email']) {
            const oldEmail = existingUser.email;
            const nextEmail = row['email'];

            const codeObj = await this.getRepo().addPasswordResetCode(userId, trx);
            const code = codeObj?.password_reset_code;

            row['verified'] = false;

            await this.mailService.enqueueMail(
              {
                to: nextEmail,
                tenant_id: auth.tenant_id,
                subject: 'Verify Your New Email Address - CampaignRaven',
                text: `Please verify your new email address by clicking this link: http://localhost:4200/verify-email?code=${code}`,
                html: `<h2>Verify Your New Email</h2>
<p>Please verify your new email address to complete the update and activate your login:</p>
<div class="btn-container">
  <a href="http://localhost:4200/verify-email?code=${code}" class="btn">Verify Email Address</a>
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
          return updatedUser;
        });
    }

    await this.syncProfile(auth, userId, data);
    const profile = (await this.profiles.getOneByAuthId(userId)) as Models['profiles'] | undefined;
    return this.sanitizeUser({ ...updated, profile });
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

  /**
   * Creates a new user profile.
   * @private
   * @param trx Kysely transaction instance.
   * @param id Profile ID.
   * @param tenant_id Tenant ID.
   * @param auth_id Auth user ID.
   * @returns Newly created profile.
   */
  private async createProfile(trx: Transaction<Models>, id: string, tenant_id: string, auth_id: string) {
    const row = { id, tenant_id, auth_id } as OperationDataType<'profiles', 'insert'>;
    const profile = await this.profiles.add({ row }, trx);
    if (!profile) {
      throw new InternalError('Something went wrong, please try again');
    }
    return profile;
  }

  /**
   * Creates a new tenant.
   * @private
   * @param trx Kysely transaction instance.
   * @param name Tenant (organization) name.
   * @returns Tenant ID of the newly created tenant.
   */
  private async createTenant(trx: Transaction<Models>, name: string) {
    const row = { name } as OperationDataType<'tenants', 'insert'>;
    const tenantAddResult = await this.tenants.add({ row }, trx);
    if (!tenantAddResult) {
      throw new InternalError('Something went wrong, please try again');
    }
    return tenantAddResult.id;
  }

  /**
   * Creates auth and refresh tokens and saves session.
   * @private
   * @param input Token input payload including user and tenant info.
   * @param trx Optional Kysely transaction.
   * @returns Auth token and refresh token pair.
   */
  private async createTokens(
    input: {
      user_id: string;
      tenant_id: string;
      name: string;
      oldSession?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    trx?: Transaction<Models>,
  ) {
    // Delete the old session
    if (input.oldSession) await this.sessions.deleteBySessionId(input.oldSession, trx);

    const row = {
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      ip_address: input.ipAddress || '',
      user_agent: input.userAgent || '',
      status: 'active',
    } as OperationDataType<'sessions', 'insert'>;

    const currentSession = await this.sessions.add({ row }, trx);

    if (!currentSession) {
      throw new InternalError('Session creation failed');
    }

    const session_id = currentSession.session_id;

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
        session_id,
      });
      return { auth_token, refresh_token: currentSession.refresh_token };
    } catch (err) {
      throw new InternalError('Token creation failed', undefined, { cause: err });
    }
  }

  /**
   * Creates a new user account record.
   * @private
   * @param trx Kysely transaction instance.
   * @param tenant_id Tenant ID to associate user with.
   * @param password Hashed password.
   * @param email User email.
   * @param input Original sign-up input object.
   * @returns Newly created user.
   */
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

  /**
   * Calculates the age (in milliseconds) of the password reset code.
   * @private
   * @param code Password reset code.
   * @returns Number of milliseconds since the code was created.
   */
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

  /**
   * Retrieves a user by email and throws if not found.
   * @private
   * @param email Email address to query.
   * @returns User record.
   */
  private async getUserByEmail(email: string) {
    const user = (await this.getRepo().getByEmail(email)) as AuthUsersType;

    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Hashes a plain text password using bcrypt.
   * @private
   * @param password Plain text password.
   * @returns Hashed password.
   */
  private async hashPassword(password: string) {
    const hashedPassword = await bcrypt.hash(password, 12);
    if (!hashedPassword) {
      throw new InternalError('Something went wrong, please try again');
    }
    return hashedPassword;
  }

  private sanitizeUser(record: any) {
    const lastName =
      record.last_name ?? record.profile_last_name ?? record.effective_last_name ?? record.profile?.last_name ?? '';

    let notificationPreferences = {
      mention_in_comment: true,
      task_assigned: true,
      task_due: true,
      person_assigned: true,
      export_ready: true,
      import_summary: true,
    };

    const profileJson = record.profile?.json ?? record.json;
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
        console.error('Failed to parse profile json for preferences', e);
      }
    }

    return {
      id: record.id != null ? String(record.id) : '',
      email: record.email ?? '',
      first_name: record.first_name ?? '',
      last_name: lastName ?? '',
      role: record.role != null ? String(record.role) : null,
      verified: this.coerceBoolean(record.verified),
      two_factor_enabled: this.coerceBoolean(record.two_factor_enabled),
      deletion_scheduled_at: this.coerceDate(record.deletion_scheduled_at),
      created_at: this.coerceDate(record.created_at),
      updated_at: this.coerceDate(record.updated_at),
      notification_preferences: notificationPreferences,
    };
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
      console.error('Failed to build user stats', err);
      return defaults;
    }
  }

  private async syncProfile(auth: IAuthKeyPayload, authUserId: string, data: UpdateAuthUserType) {
    const existingProfile = (await this.profiles.getOneByAuthId(authUserId)) as Models['profiles'] | undefined;
    const profileId = existingProfile?.id != null ? String(existingProfile.id) : authUserId;

    let finalJson: any = null;
    if (existingProfile?.json) {
      try {
        finalJson = typeof existingProfile.json === 'string' ? JSON.parse(existingProfile.json) : existingProfile.json;
      } catch (e) {
        console.error('Failed to parse existing profile json', e);
      }
    }

    if (data.notification_preferences) {
      finalJson = {
        ...(finalJson || {}),
        notifications: {
          ...((finalJson || {}).notifications || {}),
          ...data.notification_preferences,
        },
      };
    }

    if (existingProfile) {
      const row: any = {
        updatedby_id: auth.user_id,
        updated_at: new Date(),
      };
      if (data.last_name !== undefined) {
        row.last_name = data.last_name ?? null;
      }
      if (finalJson !== null) {
        row.json = JSON.stringify(finalJson);
      }

      if (data.last_name !== undefined || data.notification_preferences !== undefined) {
        await this.profiles.update({ tenant_id: auth.tenant_id as any, id: profileId as any, row });
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

  /**
   * Updates a tenant record with admin and creator information.
   * @private
   * @param trx Kysely transaction instance.
   * @param tenant_id Tenant ID to update.
   * @param admin_id Admin user ID.
   * @param createdby_id Creator user ID.
   */
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

  /**
   * Checks if a user already exists with the given email.
   * @private
   * @param email Email to check for existence.
   * @throws If email is already in use.
   */
  private async verifyUserDoesNotExist(email: string) {
    const exists = await this.getRepo().existsByEmail(email);
    if (exists) {
      throw new ConflictError('This email already exists. Did you want to sign in?');
    }
  }
}
