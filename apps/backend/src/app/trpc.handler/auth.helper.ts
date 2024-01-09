import { IAuthKeyPayload, INow, signInInputType, signUpInputType } from '@common';
import { TRPCError } from '@trpc/server';
import * as bcrypt from 'bcrypt';
import { AuthUsersType, OperationDataType, TableIdType } from 'common/src/lib/kysely.models';
import { createDecoder, createSigner } from 'fast-jwt';
import { QueryResult } from 'kysely';
import nodemailer from 'nodemailer';
import { AuthUsersOperator } from '../db.operators/auth-user.operator';
import { SessionsOperator } from '../db.operators/sessions.operator';
import { TenantsOperator } from '../db.operators/tenants.operator';
import { UserPofilesOperator } from '../db.operators/user-profiles.operator';

export class AuthHelper {
  private authUsers: AuthUsersOperator = new AuthUsersOperator();
  private profiles: UserPofilesOperator = new UserPofilesOperator();
  private sessions: SessionsOperator = new SessionsOperator();
  private tenants: TenantsOperator = new TenantsOperator();

  public async currentUser(auth: IAuthKeyPayload) {
    if (!auth?.user_id) {
      return null;
    }
    const user = await this.authUsers
      .findOne(auth.user_id, {
        columns: ['id', 'email', 'first_name'],
      })
      .catch(() => null);
    return user || null;
  }

  public async renewAuthToken(input: { auth_token: string; refresh_token: string }) {
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

    const result = await this.authUsers.updatePassword(password, code);
    if (result.numUpdatedRows === BigInt(0)) {
      throw new TRPCError({
        message: 'Wrong code, please try again',
        code: 'UNAUTHORIZED',
      });
    }
  }

  public async sendPasswordResetEmail(email: string) {
    const user = await this.getUserByEmail(email);
    const code = this.authUsers.addPasswordResetCode(user.id);

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
   * @param auth
   * @returns
   */
  public async signOut(auth: IAuthKeyPayload) {
    if (!auth?.session_id) {
      return null;
    }
    return this.sessions.deleteBySessionId(auth.session_id);
  }

  public async signUp(
    input: signUpInputType,
  ): Promise<{ auth_token: string; refresh_token: string } | TRPCError> {
    const email = input.email.toLowerCase();

    await this.verifyUserDoesNotExist(email);
    const password = await this.hashPassword(input.password);

    // TODO: should be a transaction
    const tenant_id = await this.createTenant(input.organization);
    const user = await this.createUser(tenant_id, password, email, input);
    const profile = await this.createProfile(user.id, tenant_id, user.id);
    await this.addTenantIdToProfile(tenant_id, user.id, user.id);

    return this.createTokens(profile.id, user.tenant_id, user.first_name);
  }

  private async addTenantIdToProfile(
    tenant_id: TableIdType<'tenants'>,
    admin_id: bigint,
    createdby_id: bigint,
  ) {
    await this.tenants.updateOne(tenant_id, {
      admin_id,
      createdby_id,
    } as OperationDataType<'tenants', 'update'>);
  }

  private async createProfile(id: bigint, tenant_id: bigint, auth_id: bigint) {
    const profile = await this.profiles.addOne({ id, tenant_id, auth_id });
    if (!profile) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    return profile;
  }

  private async createTenant(name: string) {
    const tenantAddResult = await this.tenants.addOne({ name });
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

    const currentSession = await this.sessions.addOne({
      user_id,
      tenant_id,
      ip_address: '',
      user_agent: '',
      status: 'active',
    });

    if (!currentSession) {
      throw new TRPCError({
        message: 'Session creation failed',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    const session_id = currentSession.id!;
    const signer = createSigner({
      key: 'supersecretkey',
      clockTimestamp: Date.now(),
      expiresIn: '30m',
    });
    const auth_token = signer({ user_id, tenant_id, name, session_id });
    return { auth_token, refresh_token: currentSession.refresh_token };
  }

  private async createUser(
    tenant_id: bigint,
    password: string,
    email: string,
    input: { email: string; first_name: string; password: string; organization: string },
  ) {
    const user = await this.authUsers.addOne({
      tenant_id,
      password,
      email,
      first_name: input.first_name,
      verified: false,
    });

    if (!user) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    return user;
  }

  private async getCodeAge(code: string): Promise<number> {
    const nowData: QueryResult<INow> = await this.authUsers.nowTime();
    if (!nowData || !nowData?.rows[0]?.now) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    const data: Partial<AuthUsersType> = await this.authUsers.getPasswordResetCodeTime(code);
    const thenTimestamp = (data.password_reset_code_created_at || new Date().toString()) as string;
    const then = new Date(thenTimestamp);

    const now = new Date(nowData?.rows[0]?.now || new Date().toString());

    return now.getTime() - then.getTime();
  }

  private async getUserByEmail(email: string) {
    const user = (await this.authUsers.findOneByEmail(email)) as AuthUsersType;

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

  private async verifyUserDoesNotExist(email: string) {
    const count = await this.authUsers.getCountByEmail(email);
    if (count > 0) {
      throw new TRPCError({
        message: 'This email already exists. Did you want to sign in?',
        code: 'CONFLICT',
      });
    }
  }
}
