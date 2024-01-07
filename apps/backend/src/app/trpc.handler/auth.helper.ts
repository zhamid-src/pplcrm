import { IAuthKeyPayload, INow, signInInputType, signUpInputType } from '@common';
import { TRPCError } from '@trpc/server';
import * as bcrypt from 'bcrypt';
import { AuthUsersType, OperationDataType } from 'common/src/lib/kysely.models';
import { createDecoder, createSigner } from 'fast-jwt';
import { QueryResult } from 'kysely';
import nodemailer from 'nodemailer';
import { AuthUsersOperator } from '../db.operators/auth-user.operator';
import { SessionsOperator } from '../db.operators/sessions.operator';
import { TenantsOperator } from '../db.operators/tenants.operator';
import { UserPofilesOperator } from '../db.operators/user-profiles.operator';

const tenants: TenantsOperator = new TenantsOperator();
const authUsers: AuthUsersOperator = new AuthUsersOperator();
const profiles: UserPofilesOperator = new UserPofilesOperator();
const sessions: SessionsOperator = new SessionsOperator();

/**
 * The hellper class for TRPC auth endpoint
 */
export class AuthHelper {
  public async currentUser(auth: IAuthKeyPayload) {
    if (!auth?.user_id) {
      return null;
    }
    const user = await authUsers
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
    const password = await bcrypt.hash(plaintextPassword, 10);

    if (!password) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    // Check if the code is valid
    const nowData: QueryResult<INow> = await authUsers.nowTime();
    if (!nowData || !nowData?.rows[0]?.now) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    const data: Partial<AuthUsersType> = await authUsers.getPasswordResetCodeTime(code);
    const thenTimestamp = (data.password_reset_code_created_at || new Date().toString()) as string;
    const nowTimestamp = (nowData?.rows[0]?.now || new Date().toString()) as string;

    // See if codeTime is less than 15 minutes ago
    const then = new Date(thenTimestamp);
    const now = new Date(nowTimestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes > 15) {
      throw new TRPCError({
        message: 'The code is expired. Please request a new code',
        code: 'BAD_REQUEST',
      });
    }

    const result = await authUsers.updatePassword(password, code);
    if (result.numUpdatedRows === BigInt(0)) {
      throw new TRPCError({
        message: 'Wrong code, please try again',
        code: 'UNAUTHORIZED',
      });
    }

    return null;
  }

  public async sendPasswordResetEmail(email: string) {
    const user = (await authUsers.findOneByEmail(email)) as AuthUsersType;

    if (!user) {
      throw new TRPCError({
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    // set the reset code
    const code = authUsers.addPasswordResetCode(user.id);

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
    const user = (await authUsers.findOneByEmail(input.email)) as AuthUsersType;

    if (!user || !bcrypt.compareSync(input.password, user.password)) {
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
    return sessions.deleteBySessionId(auth.session_id);
  }

  /**
   * Create the new user
   * @param input
   * @returns
   */
  public async signUp(
    input: signUpInputType,
  ): Promise<{ auth_token: string; refresh_token: string } | TRPCError> {
    const email = input.email.toLowerCase();

    // TODO: should be a transaction

    // *** 1- check if the user already exists:
    const count = await authUsers.getCountByEmail(email);
    if (count > 0) {
      throw new TRPCError({
        message: 'This email already exists. Did you want to sign in?',
        code: 'CONFLICT',
      });
    }

    // *** 2 - encrypt password
    const password = await bcrypt.hash(input.password, 10);

    if (!password) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    // *** 3- add tenant
    //const tenantAddResult = await tenants.add({ name: input.organization });

    const tenantAddResult = await tenants.addOne({ name: input.organization });
    if (!tenantAddResult) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
    const tenant_id = tenantAddResult.id;

    // Now create a new user in auth
    const user = await authUsers.addOne({
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

    // Finally, add a profile for the user
    const profile = await profiles.addOne({
      id: user.id,
      tenant_id,
      auth_id: user.id,
    });

    if (!profile) {
      throw new TRPCError({
        message: 'Something went wrong, please try again',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    // now go back and update the tenant with the profile id
    await tenants.updateOne(tenant_id, {
      admin_id: profile.id,
      createdby_id: profile.id,
    } as OperationDataType<'tenants', 'update'>);

    // TODO: make the hash a secret
    return this.createTokens(profile.id, user.tenant_id, user.first_name);
  }

  /**
   * Private function to create tokens
   * @param user_id
   * @param tenant_id
   * @param name
   * @param oldSession
   * @returns
   */
  private async createTokens(
    user_id: bigint,
    tenant_id: bigint,
    name: string,
    oldSession?: string,
  ) {
    // Delete the old session
    oldSession && (await sessions.deleteBySessionId(oldSession));

    const currentSession = await sessions.addOne({
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
}
