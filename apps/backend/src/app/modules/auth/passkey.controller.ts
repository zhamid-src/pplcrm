import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';
import { randomBytes } from 'crypto';
import { env } from '../../../env';
import { BaseRepository } from '../../lib/base.repo';
import { storeChallenge, consumeChallenge } from '../../lib/webauthn-challenges';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../errors/app-errors';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src';
import { createTokens } from './auth-tokens';

const rpID = env.webAuthnRpId;
const rpName = env.webAuthnRpName;

function getExpectedOrigins(): string[] {
  const origins: string[] = [env.appUrl];
  if (env.apiUrl !== env.appUrl) {
    try {
      origins.push(new URL(env.apiUrl).origin);
    } catch {}
  }
  return origins;
}

export class PasskeyController {
  private get db() {
    return BaseRepository.dbInstance;
  }

  // ── Registration ─────────────────────────────────────────────────────────

  async getRegistrationOptions(auth: IAuthKeyPayload) {
    const user = await this.db
      .selectFrom('authusers')
      .select(['id', 'email', 'first_name', 'last_name'])
      .where('id', '=', auth.user_id as any)
      .executeTakeFirst();

    if (!user) throw new NotFoundError('User not found');

    const existingPasskeys = await this.db
      .selectFrom('passkeys')
      .select(['credential_id', 'transports'])
      .where('user_id', '=', auth.user_id as any)
      .execute();

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: [user.first_name, (user as any).last_name].filter(Boolean).join(' '),
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: pk.credential_id,
        transports: (pk.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    storeChallenge(`reg:${auth.user_id}`, options.challenge);
    return options;
  }

  async verifyRegistration(auth: IAuthKeyPayload, response: RegistrationResponseJSON, friendlyName?: string) {
    const challenge = consumeChallenge(`reg:${auth.user_id}`);
    if (!challenge) throw new BadRequestError('Registration challenge expired or not found. Please try again.');

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestError('Passkey registration verification failed.');
    }

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo;

    const user = await this.db
      .selectFrom('authusers')
      .select('tenant_id')
      .where('id', '=', auth.user_id as any)
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('passkeys')
      .values({
        user_id: auth.user_id as any,
        tenant_id: user.tenant_id as any,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter as any,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: (credential.transports as string[] | undefined) ?? null,
        aaguid: aaguid ?? null,
        friendly_name: friendlyName ?? null,
      })
      .execute();

    return { verified: true };
  }

  // ── Authentication ────────────────────────────────────────────────────────

  async getAuthenticationOptions() {
    const nonce = randomBytes(16).toString('hex');

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: [], // discoverable credential — browser prompts user to choose
    });

    storeChallenge(`auth:${nonce}`, options.challenge);
    return { options, nonce };
  }

  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    nonce: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const challenge = consumeChallenge(`auth:${nonce}`);
    if (!challenge) throw new UnauthorizedError('Authentication challenge expired. Please try again.');

    const passkey = await this.db
      .selectFrom('passkeys')
      .selectAll()
      .where('credential_id', '=', response.id)
      .executeTakeFirst();

    if (!passkey) throw new UnauthorizedError('Passkey not recognized.');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: rpID,
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64url'),
        counter: Number(passkey.counter),
        transports: (passkey.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) throw new UnauthorizedError('Passkey authentication failed.');

    // Update counter
    await this.db
      .updateTable('passkeys')
      .set({ counter: verification.authenticationInfo.newCounter as any })
      .where('credential_id', '=', passkey.credential_id)
      .execute();

    // Fetch the user
    const user = await this.db
      .selectFrom('authusers')
      .select(['id', 'email', 'first_name', 'last_name', 'tenant_id', 'role', 'verified', 'deletion_scheduled_at'])
      .where('id', '=', passkey.user_id as any)
      .executeTakeFirst();

    if (!user) throw new UnauthorizedError();
    if (!user.verified) throw new UnauthorizedError('Email not verified.');

    const tenantId = String(user.tenant_id);
    const userId = String(user.id);

    return createTokens({
      user_id: userId,
      tenant_id: tenantId,
      name: user.first_name,
      ipAddress,
      userAgent,
    });
  }

  // ── Email Check ──────────────────────────────────────────────────────────

  async checkEmailPasskeys(email: string): Promise<{ hasPasskeys: boolean }> {
    const user = await this.db
      .selectFrom('authusers')
      .select('id')
      .where('email', '=', email.trim().toLowerCase())
      .executeTakeFirst();

    if (!user) return { hasPasskeys: false };

    const row = await this.db
      .selectFrom('passkeys')
      .select(this.db.fn.countAll<string>().as('count'))
      .where('user_id', '=', user.id as any)
      .executeTakeFirst();

    return { hasPasskeys: Number(row?.count ?? 0) > 0 };
  }

  // ── Management ────────────────────────────────────────────────────────────

  async listPasskeys(auth: IAuthKeyPayload) {
    return this.db
      .selectFrom('passkeys')
      .select(['id', 'friendly_name', 'device_type', 'backed_up', 'aaguid', 'transports', 'created_at'])
      .where('user_id', '=', auth.user_id as any)
      .orderBy('created_at', 'asc')
      .execute();
  }

  async deletePasskey(auth: IAuthKeyPayload, id: string) {
    const result = await this.db
      .deleteFrom('passkeys')
      .where('id', '=', id as any)
      .where('user_id', '=', auth.user_id as any)
      .executeTakeFirst();

    if (Number(result.numDeletedRows) === 0) {
      throw new NotFoundError('Passkey not found.');
    }
    return { success: true };
  }

  async updatePasskeyName(auth: IAuthKeyPayload, id: string, friendlyName: string) {
    const result = await this.db
      .updateTable('passkeys')
      .set({ friendly_name: friendlyName })
      .where('id', '=', id as any)
      .where('user_id', '=', auth.user_id as any)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundError('Passkey not found.');
    }
    return { success: true };
  }
}
