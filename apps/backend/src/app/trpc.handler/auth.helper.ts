/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAuthUser } from "@common";
import { TRPCError } from "@trpc/server";
import * as bcrypt from "bcrypt";
import { AuthTokenPayload, createSigner } from "fast-jwt";
import { sql } from "kysely";
import nodemailer from "nodemailer";
import { z } from "zod";
import { AuthUsersOperator } from "../db.operators/auth-user.operator";
import { SessionsOperator } from "../db.operators/sessions.operator";
import { TenantsOperator } from "../db.operators/tenants.operator";
import { UserPofilesOperator } from "../db.operators/users.operator";
import { AuthUsersType, OperationDataType } from "../kysely.models";
import { db } from "../kyselyiit";

const tenants: TenantsOperator = new TenantsOperator();
const authUsers: AuthUsersOperator = new AuthUsersOperator();
const profiles: UserPofilesOperator = new UserPofilesOperator();
const sessions: SessionsOperator = new SessionsOperator();

export const signUpInputObj = z.object({
  organization: z.string(),
  email: z.string().max(100),
  password: z.string().min(8).max(72),
  first_name: z.string().max(100),
  middle_names: z.string().nullable(),
  last_name: z.string().nullable(),
});
export type signUpInputType = z.infer<typeof signUpInputObj>;

export const signInInputObj = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type signInInputType = z.infer<typeof signInInputObj>;

export class AuthHelper {
  public async currentUser(auth: AuthTokenPayload | null) {
    if (!auth?.sub) {
      return null;
    }
    const user = await authUsers.getOneById(+auth.sub, {
      columns: ["id", "email", "first_name"],
    });
    // get the auth header
    return user as IAuthUser;
  }

  public async resetPassword(plaintextPassword: string, code: string) {
    const password = await bcrypt.hash(plaintextPassword, 10);

    if (!password) {
      throw new TRPCError({
        message: "Something went wrong, please try again",
        code: "UNAUTHORIZED",
      });
    }

    // Check if the code is valid
    const data: Partial<AuthUsersType> =
      await authUsers.getPasswordResetCodeTime(code);
    const thenTimestamp =
      data.password_reset_code_created_at as unknown as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nowData: any = await sql`select now()::timestamp`.execute(db);

    if (!nowData || !nowData?.rows[0]?.now) {
      throw new TRPCError({
        message: "Something went wrong, please try again",
        code: "UNAUTHORIZED",
      });
    }

    const nowTimestamp = nowData?.rows[0]?.now as unknown as string;

    // See if codeTime is less than 15 minutes ago
    const then = new Date(thenTimestamp);
    const now = new Date(nowTimestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes > 15) {
      throw new TRPCError({
        message: "The code is expired. Please request a new code",
        code: "BAD_REQUEST",
      });
    }

    const result = await authUsers.updatePassword(password, code);
    if (result.numUpdatedRows === BigInt(0)) {
      throw new TRPCError({
        message: "Wrong code, please try again",
        code: "UNAUTHORIZED",
      });
    }

    return true;
  }

  public async sendPasswordResetEmail(email: string) {
    const user = (await authUsers.getOneByEmail(email)) as AuthUsersType;

    if (!user) {
      throw new TRPCError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // set the reset code
    const code = authUsers.addPasswordResetCode(user.id as unknown as number);

    // send the reset email
    const transport = nodemailer.createTransport({
      sendmail: true,
    });

    transport.sendMail(
      {
        from: '"CampaignRaven" <pplcrm@campaignraven.com>',
        to: email,
        subject: "Your password reset link",
        text: `Hey there, please click this link to reset your password: http://localhost:4200/new-password?code=${code}`,
        html: `<b>Hey there! </b><br> please click this link to reset your password: <a href='http://localhost:4200/new-password?code=${code}'>http://localhost:4200/new-password?code=${code}</a>`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, info: any) => {
        if (err) {
          throw new TRPCError({
            message: "Something went wrong, please try again",
            code: "UNAUTHORIZED",
          });
        }
      },
    );
    return true;
  }

  public async signIn(input: signInInputType) {
    const user = (await authUsers.getOneByEmail(input.email)) as AuthUsersType;

    if (!user) {
      throw new TRPCError({
        message: "Wrong email and password.",
        code: "UNAUTHORIZED",
      });
    }

    const isMatch = bcrypt.compareSync(input.password, user.password);
    if (!isMatch) {
      throw new TRPCError({ message: "Wrong password!", code: "FORBIDDEN" });
    }

    return this.createTokens(
      user.id as unknown as number,
      user.tenant_id,
      user.first_name,
    );
  }

  public async signOut(auth: AuthTokenPayload | null) {
    if (!auth?.sub) {
      return null;
    }
    return sessions.deleteByAuthUserId(+auth.sub);
  }

  public async signUp(
    input: signUpInputType,
  ): Promise<{ auth_token: string; refresh_token: string } | TRPCError> {
    const email = input.email.toLowerCase();

    // TODO: should be a transaction

    // *** 1- check if the user already exists:
    const count = await authUsers.getCountByEmail(email);
    if (count > 0) {
      throw new TRPCError({
        message: "This email already exists. Did you want to sign in?",
        code: "CONFLICT",
      });
    }

    // *** 2 - encrypt password
    const password = await bcrypt.hash(input.password, 10);

    if (!password) {
      throw new TRPCError({
        message: "Something went wrong, please try again",
        code: "UNAUTHORIZED",
      });
    }

    // *** 3- add tenant
    //const tenantAddResult = await tenants.add({ name: input.organization });

    const tenantAddResult = await tenants.add({ name: input.organization });
    if (!tenantAddResult) {
      throw new TRPCError({
        message: "Something went wrong, please try again",
        code: "UNAUTHORIZED",
      });
    }
    const tenant_id = tenantAddResult.id;

    // Now create a new user in auth
    const user: AuthUsersType | undefined = (await authUsers.add({
      tenant_id,
      password,
      email,
      first_name: input.first_name,
      last_name: input.last_name,
      middle_names: input.middle_names,
      verified: false,
    })) as unknown as AuthUsersType;

    if (!user) {
      throw new TRPCError({
        message: "Something went wrong, please try again",
        code: "UNAUTHORIZED",
      });
    }

    // Finally, add a profile for the user
    const profile = await profiles.add({
      uid: user.id as unknown as number,
      tenant_id,
      auth_id: user.id as unknown as number,
    } as OperationDataType<"profiles", "insert">);

    if (!profile) {
      throw new TRPCError({
        message: "Something went wrong, please try again",
        code: "UNAUTHORIZED",
      });
    }

    // now go back and update the tenant with the profile id
    const tenantUpdateResult = await tenants.update(tenant_id, {
      admin_id: profile.uid,
      createdby_id: profile.uid,
    } as OperationDataType<"tenants", "update">);

    // TODO: make the hash a secret
    return this.createTokens(profile.uid, user.tenant_id, user.first_name);
  }

  private async createTokens(user_id: number, tenant_id: number, name: string) {
    // start a new session
    const expires_at = new Date();
    expires_at.setTime(expires_at.getTime() + 30 /* minutes */ * 60 * 1000);

    const currentSession = await sessions.add({
      user_id,
      tenant_id,
      ip_address: "",
      user_agent: "",
      status: "active",
      expires_at,
    });

    if (!currentSession) {
      throw new TRPCError({
        message: "Session creation failed",
        code: "UNAUTHORIZED",
      });
    }

    // TODO: add a secret key
    const authPayload: AuthTokenPayload = {
      expiresIn: "30m",
      iss: "pplcrm",
      sub: user_id.toString(),
      //nonce: random key?
    };

    const signer = createSigner({ key: "supersecretkey" });
    const auth_token = signer(authPayload);

    return { auth_token, refresh_token: currentSession.refresh_token };
  }
}
