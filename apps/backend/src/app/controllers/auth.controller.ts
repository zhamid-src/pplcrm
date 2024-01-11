import { IAuthKeyPayload, INow, IToken, signInInputType, signUpInputType } from '@common';
import { TRPCError } from '@trpc/server';
import * as bcrypt from 'bcrypt';
import {
  AuthUsersType,
  GetOperandType,
  Models,
  OperationDataType,
} from 'common/src/lib/kysely.models';
import { createDecoder, createSigner } from 'fast-jwt';
import { QueryResult, Transaction } from 'kysely';
import nodemailer from 'nodemailer';
import { AuthUsersRepository } from '../repositories/auth-user.repository';
import { SessionsRepository } from '../repositories/sessions.repository';
import { TenantsRepository } from '../repositories/tenants.repository';
import { UserPofilesRepository } from '../repositories/user-profiles.repository';
import { BaseController } from './base.controller';

export class AuthController extends BaseController<'authusers', AuthUsersRepository> {
  private profiles: UserPofilesRepository = new UserPofilesRepository();
  private sessions: SessionsRepository = new SessionsRepository();
  private tenants: TenantsRepository = new TenantsRepository();

  constructor() {
    super(new AuthUsersRepository());
  }

  public async currentUser(auth: IAuthKeyPayload) {
    if (!auth?.user_id) {
      return null;
    }
    const user = await this.getOperator()
      .findOne(auth.user_id, {
        columns: ['id', 'email', 'first_name'],
      })
      .catch(() => null);
    return user || null;
  }

  public async renewAuthToken(input: IToken) {
    if (!input?.auth_token || !input?.refresh_token) {
      throw new TRPCError({
        message: 'Missing auth token',
        code: 'UNAUTHORIZED',
      });
    }
    const decode = createDecoder();
    const payload = decode(input.auth_token);

    return this.createTokens(payload.user_id, payload.tenant_id, payload.name, payload.session_id);
  }

  public async resetPassword(plaintextPassword: string, code: string) {
    const password = await this.hashPassword(plaintextPassword);

    // Check if the code is valid
    const minutes = await this.getCodeAge(code);
    if (minutes > 15) {
      throw new TRPCError({
        message: 'The code is expired. Please request a new code',
        code: 'BAD_REQUEST',
      });
    }

    const result = await this.getOperator().updatePassword(password, code);
    if (result.numUpdatedRows === BigInt(0)) {
      throw new TRPCError({
        message: 'Wrong code, please try again',
        code: 'UNAUTHORIZED',
      });
    }
  }

  public async sendPasswordResetEmail(email: string) {
    const user = await this.getUserByEmail(email);
    const code = this.getOperator().addPasswordResetCode(user.id);

    // send the reset email
    const transport = nodemailer.createTransport({
      sendmail: true,
    });

    transport.sendMail(
      {
        from: '"CampaignRaven" <pplcrm@campaignraven.com>',
        to: email,
        subject: 'Your password reset link',
        text: `Hey there, please click this link to reset your password: http://localhost:4200/new-password?code=${code}`,
        html: `<b>Hey there! </b><br> please click this link to reset your password: <a href='http://localhost:4200/new-password?code=${code}'>http://localhost:4200/new-password?code=${code}</a>`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any) => {
        if (err) {
          throw new TRPCError({
            message: 'Something went wrong, please try again',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }
      },
    );
    return true;
  }

  public async signIn(input: signInInputType) {
    const user = await this.getUserByEmail(input.email);

    if (!bcrypt.compareSync(input.password, user.password)) {
      throw new TRPCError({
        message:
          'Sorry this email or password is not valid. If you forgot your password, you can reset it.',
        code: 'UNAUTHORIZED',
      });
    }

    return this.createTokens(user.id, user.tenant_id, user.first_name);
  }

  /**
   * Sign out the current user and invalidate the token
   * TODO: should check the auth token in session table in other functions so a user
   * can't use the saved token
   */
  public async signOut(auth: IAuthKeyPayload) {
    if (!auth?.session_id) {
      return null;
    }
    return this.sessions.deleteBySessionId(auth.session_id);
  }

  public async signUp(input: signUpInputType): Promise<IToken | TRPCError> {
    const email = input.email.toLowerCase();
    let token = { auth_token: '', refresh_token: '' };

    await this.verifyUserDoesNotExist(email);
    const password = await this.hashPassword(input.password);

    this.tenants.transaction().execute(async (trx) => {
      const tenant_id = await this.createTenant(trx, input.organization);
      const user = await this.createUser(trx, tenant_id, password, email, input);
      const profile = await this.createProfile(trx, user.id, tenant_id, user.id);
      await this.updateTenantWithAdmin(trx, tenant_id, user.id, user.id);
      token = await this.createTokens(profile.id, user.tenant_id, user.first_name);
    });

    return token;
  }

  private async createProfile(
    trx: Transaction<Models>,
    id: bigint,
    tenant_id: bigint,
    auth_id: bigint,
  ) {
    const row = { id, tenant_id, auth_id } as OperationDataType<'profiles', 'insert'>;
    const profile = await this.profiles.addOne(row, trx);
    if (!profile) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    return profile;
  }

  private async createTenant(trx: Transaction<Models>, name: string) {
    const row = { name } as OperationDataType<'tenants', 'insert'>;
    const tenantAddResult = await this.tenants.addOne(row, trx);
    if (!tenantAddResult) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    return tenantAddResult.id;
  }

  private async createTokens(
    user_id: bigint,
    tenant_id: bigint,
    name: string,
    oldSession?: string,
  ) {
    // Delete the old session
    oldSession && (await this.sessions.deleteBySessionId(oldSession));

    const row = {
      user_id,
      tenant_id,
      ip_address: '',
      user_agent: '',
      status: 'active',
    } as OperationDataType<'sessions', 'insert'>;
    const currentSession = await this.sessions.addOne(row);

    if (!currentSession) {
      throw new TRPCError({
        message: 'Session creation failed',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    const session_id = currentSession.id!;
    const key = process.env['SHARED_SECRET'];
    const signer = createSigner({
      algorithm: 'HS256',
      key,
      clockTimestamp: Date.now(),
      expiresIn: '30m',
    });
    const auth_token = signer({ user_id, tenant_id, name, session_id });
    return { auth_token, refresh_token: currentSession.refresh_token };
  }

  private async createUser(
    trx: Transaction<Models>,
    tenant_id: bigint,
    password: string,
    email: string,
    input: { email: string; first_name: string; password: string; organization: string },
  ) {
    const row = {
      tenant_id,
      password,
      email,
      first_name: input.first_name,
      verified: false,
    } as OperationDataType<'authusers', 'insert'>;
    const user = await this.getOperator().addOne(row, trx);

    if (!user) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    return user;
  }

  private async getCodeAge(code: string): Promise<number> {
    const nowData: QueryResult<INow> = await this.getOperator().nowTime();
    if (!nowData || !nowData?.rows[0]?.now) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    const data: Partial<AuthUsersType> = await this.getOperator().getPasswordResetCodeTime(code);
    const thenTimestamp = (data.password_reset_code_created_at || new Date().toString()) as string;
    const then = new Date(thenTimestamp);

    const now = new Date(nowData?.rows[0]?.now || new Date().toString());

    return now.getTime() - then.getTime();
  }

  private async getUserByEmail(email: string) {
    const user = (await this.getOperator().findOneByEmail(email)) as AuthUsersType;

    if (!user) {
      throw new TRPCError({
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }
    return user;
  }

  private async hashPassword(password: string) {
    await bcrypt.hash(password, 10);
    if (!password) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    return password;
  }

  // TODO: remove any
  private async updateTenantWithAdmin(
    trx: Transaction<Models>,
    tenant_id: bigint,
    admin_id: bigint,
    createdby_id: bigint,
  ) {
    const row = { admin_id, createdby_id } as OperationDataType<'tenants', 'update'>;
    await this.tenants.updateOne(tenant_id as GetOperandType<'authusers', 'update', any>, row, trx);
  }

  private async verifyUserDoesNotExist(email: string) {
    const count = await this.getOperator().getCountByEmail(email);
    if (count > 0) {
      throw new TRPCError({
        message: 'This email already exists. Did you want to sign in?',
        code: 'CONFLICT',
      });
    }
  }
}
