import * as bcrypt from 'bcrypt';

import { IAuthKeyPayload, INow, IToken, signInInputType, signUpInputType } from '@common';

import { createDecoder, createSigner } from 'fast-jwt';
import { QueryResult, Transaction } from 'kysely';
import nodemailer from 'nodemailer';

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
import { AuthUsersRepo } from './repositories/authusers.repo';
import { QueryParams } from '../../lib/base.repo';
import { SessionsRepo } from './repositories/sessions.repo';
import { TenantsRepo } from './repositories/tenants.repo';
import { UserProfiles } from '../userprofiles/repositories/userprofiles.repo';
import { BaseController } from '../../lib/base.controller';
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

    // Check if the code is valid
    const msec = await this.getCodeAge(code);
    // 15 minutes in milliseconds
    if (msec > 15 * 60 * 1000) {
      throw new BadRequestError('The code is expired. Please request a new code');
    }

    const result = await this.getRepo().updatePassword(password, code);
    if (result.numUpdatedRows === BigInt(0)) {
      throw new UnauthorizedError();
    }
  }

  /**
   * Sends a password reset email with a reset link.
   * @param email User's email address.
   * @returns Boolean indicating success.
   * @throws If email sending fails or user is not found.
   */
  public async sendPasswordResetEmail(email: string) {
    const user = await this.getUserByEmail(email);
    const code = await this.getRepo().addPasswordResetCode(user.id);

    // send the reset email
    const transport = nodemailer.createTransport({
      sendmail: true,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        transport.sendMail(
          {
            from: '"CampaignRaven" <pplcrm@campaignraven.com>',
            to: email,
            subject: 'Your password reset link',
            text: `Hey there, please click this link to reset your password: http://localhost:4200/new-password?code=${code}`,
            html: `<b>Hey there! </b><br> please click this link to reset your password: <a href='http://localhost:4200/new-password?code=${code}'>http://localhost:4200/new-password?code=${code}</a>`,
          },
          (err: Error | null) => {
            if (err) return reject(new InternalError('Something went wrong, please try again'));
            return resolve();
          },
        );
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new InternalError('Something went wrong, please try again', undefined, { cause: err });
    }
    return Promise.resolve(false);
  }

  /**
   * Authenticates a user with email and password.
   * @param input Object containing `email` and `password`.
   * @returns Newly generated auth and refresh tokens.
   * @throws If credentials are invalid.
   */
  public async signIn(input: signInInputType) {
    const user = await this.getUserByEmail(input.email.toLowerCase());

    if (!bcrypt.compareSync(input.password, user.password)) {
      throw new UnauthorizedError();
    }

    return this.createTokens({
      user_id: user.id,
      tenant_id: user.tenant_id,
      name: user.first_name,
    });
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
        const profile = await this.createProfile(trx, user.id, tenant_id, user.id);
        await this.updateTenantWithAdmin(trx, tenant_id, user.id, user.id);
        token = await this.createTokens({
          user_id: profile.id,
          tenant_id: user.tenant_id,
          name: user.first_name,
        });
      });

      return token;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new InternalError('Something went wrong, please try again', undefined, { cause: err });
    }
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
   * @returns Auth token and refresh token pair.
   */
  private async createTokens(input: { user_id: string; tenant_id: string; name: string; oldSession?: string }) {
    // Delete the old session
    if (input.oldSession) await this.sessions.deleteBySessionId(input.oldSession);

    const row = {
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      ip_address: '',
      user_agent: '',
      status: 'active',
    } as OperationDataType<'sessions', 'insert'>;

    const currentSession = await this.sessions.add({ row });

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
      clockTimestamp: Date.now() / 1000, // Convert to seconds
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
