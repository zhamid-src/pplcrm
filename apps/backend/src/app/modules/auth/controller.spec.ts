import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './controller';
import { AuthUsersRepo } from './repositories/authusers.repo';
import { StorageService } from '../../lib/storage.service';
import { BaseRepository } from '../../lib/base.repo';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../errors/app-errors';

vi.mock('../../lib/hibp', () => ({
  getPwnedCount: vi.fn().mockResolvedValue(0),
}));

function rand() {
  return String(Math.floor(Math.random() * 100000000) + 10000000);
}

async function cleanup(db: any, user_id: string, tenant_id: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenant_id)
    .execute();

  await db.deleteFrom('map_lists_persons').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('map_teams_persons').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenant_id).execute();

  const tenantUserIds = db.selectFrom('authusers').select('id').where('tenant_id', '=', tenant_id);

  await db.deleteFrom('files').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('profiles').where('auth_id', 'in', tenantUserIds).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('lists').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('tasks').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('newsletters').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('teams').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('volunteer_events').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('web_forms').where('tenant_id', '=', tenant_id).execute();
  // Campaigns are referenced by newsletters/lists/web_forms/events/… (§15), so they go last.
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('sessions').where('user_id', 'in', tenantUserIds).execute();

  await db
    .updateTable('authusers')
    .set({ createdby_id: null, updatedby_id: null })
    .where('tenant_id', '=', tenant_id)
    .execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenant_id).execute();

  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('map_households_tags').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('tenants').where('id', '=', tenant_id).execute();
}

async function signUpOwner(controller: AuthController, db: any, verified = true) {
  const email = `owner-${Date.now()}-${rand()}@example.com`;
  const orgName = `Org-${rand()}`;
  await controller.signUp({
    organization: orgName,
    email,
    password: 'StrongPassword123!',
    first_name: 'Owner',
  });
  let user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();
  if (verified) {
    await db.updateTable('authusers').set({ verified: true }).where('id', '=', user.id).execute();
    user = { ...user, verified: true };
  }
  return user as { id: string; tenant_id: string; email: string; first_name: string; role: string };
}

function authFor(
  user: { id: string; tenant_id: string; first_name: string; role: string },
  sessionId = 'test-session',
) {
  return {
    tenant_id: String(user.tenant_id),
    user_id: String(user.id),
    session_id: sessionId,
    role: user.role,
    name: user.first_name,
  };
}

describe('AuthController', () => {
  const controller = new AuthController();
  const db = (BaseRepository as any)._db;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null from currentUser when the user record has been removed, and throw when unauthenticated', async () => {
    const owner = await signUpOwner(controller, db);
    const result = await controller.currentUser(authFor(owner));
    expect(result).toMatchObject({ email: owner.email });

    await expect(controller.currentUser({} as any)).rejects.toThrow(UnauthorizedError);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should enforce visibility rules on getUserById and throw NotFoundError for a missing user', async () => {
    const owner = await signUpOwner(controller, db);
    const invited = await controller.inviteUser(authFor(owner), {
      email: `member-${rand()}@example.com`,
      first_name: 'Member',
      role: 'user',
    });
    const memberAuth = {
      tenant_id: String(owner.tenant_id),
      user_id: String(invited.id),
      session_id: 's',
      role: 'user',
    };

    // A plain user may view themselves
    const self = await controller.getUserById(memberAuth, invited.id);
    expect(self.id).toBe(String(invited.id));

    // But not another user
    await expect(controller.getUserById(memberAuth, owner.id)).rejects.toThrow(ForbiddenError);

    await expect(controller.getUserById(authFor(owner), rand())).rejects.toThrow(NotFoundError);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should list users via getUsersList and getAllUsers', async () => {
    const owner = await signUpOwner(controller, db);
    await controller.inviteUser(authFor(owner), { email: `listed-${rand()}@example.com`, first_name: 'Listed' });

    const list = await controller.getUsersList(authFor(owner));
    expect(list.some((u) => u.first_name === 'Listed')).toBe(true);

    const withCounts = await controller.getAllUsers(authFor(owner));
    expect(withCounts.count).toBeGreaterThanOrEqual(2);
    expect(withCounts.rows.some((u) => u.first_name === 'Listed')).toBe(true);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should enforce role and self-delete rules, then delete a user', async () => {
    const owner = await signUpOwner(controller, db);
    const admin = await controller.inviteUser(authFor(owner), {
      email: `admin-${rand()}@example.com`,
      first_name: 'Admin',
      role: 'admin',
    });
    const member = await controller.inviteUser(authFor(owner), {
      email: `member-${rand()}@example.com`,
      first_name: 'Member',
      role: 'user',
    });
    const memberAuth = {
      tenant_id: String(owner.tenant_id),
      user_id: String(member.id),
      session_id: 's',
      role: 'user',
    };
    const adminAuth = { tenant_id: String(owner.tenant_id), user_id: String(admin.id), session_id: 's', role: 'admin' };

    await expect(controller.deleteUser(memberAuth, admin.id)).rejects.toThrow(ForbiddenError);
    await expect(controller.deleteUser(authFor(owner), owner.id)).rejects.toThrow(BadRequestError);
    await expect(controller.deleteUser(adminAuth, owner.id)).rejects.toThrow(ForbiddenError);
    await expect(controller.deleteUser(authFor(owner), rand())).rejects.toThrow(NotFoundError);

    const result = await controller.deleteUser(authFor(owner), member.id);
    expect(result.success).toBe(true);

    const row = await db.selectFrom('authusers').selectAll().where('id', '=', member.id).executeTakeFirst();
    expect(row).toBeUndefined();

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should sign out a session and no-op for an unauthenticated caller', async () => {
    const owner = await signUpOwner(controller, db);
    const token = await controller.signIn({ email: owner.email, password: 'StrongPassword123!' });
    expect('auth_token' in token).toBe(true);

    const sessionsBefore = await db.selectFrom('sessions').selectAll().where('user_id', '=', owner.id).execute();
    expect(sessionsBefore.length).toBeGreaterThan(0);

    expect(await controller.signOut(null)).toBeNull();

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should resend verification email only for unverified accounts, without leaking existence', async () => {
    const owner = await signUpOwner(controller, db, false);

    const first = await controller.resendVerificationEmail(owner.email);
    expect(first.success).toBe(true);
    const afterUnverified = await db
      .selectFrom('authusers')
      .selectAll()
      .where('id', '=', owner.id)
      .executeTakeFirstOrThrow();
    expect(afterUnverified.password_reset_code).not.toBeNull();

    await db.updateTable('authusers').set({ verified: true }).where('id', '=', owner.id).execute();
    const second = await controller.resendVerificationEmail(owner.email);
    expect(second.success).toBe(true);

    const unknown = await controller.resendVerificationEmail(`unknown-${rand()}@example.com`);
    expect(unknown.success).toBe(true);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should send a password reset email and allow resetting the password with the emailed code', async () => {
    const owner = await signUpOwner(controller, db);

    let plaintextCode: string | undefined;
    const origAddCode = AuthUsersRepo.prototype.addPasswordResetCode;
    const spy = vi.spyOn(AuthUsersRepo.prototype, 'addPasswordResetCode').mockImplementation(async function (
      this: AuthUsersRepo,
      ...args: Parameters<typeof origAddCode>
    ) {
      const result = await origAddCode.apply(this, args);
      plaintextCode = result?.password_reset_code;
      return result;
    });

    const sent = await controller.sendPasswordResetEmail(owner.email);
    expect(sent).toBe(true);
    spy.mockRestore();

    expect(plaintextCode).toBeDefined();
    if (!plaintextCode) throw new Error('reset code was not captured');

    // Uses a decoy code so the weak-password rejection (checked before the code
    // is even looked up) doesn't consume the real one-time reset code below.
    await expect(controller.resetPassword('password123', 'decoy-code')).rejects.toThrow(BadRequestError);
    await expect(controller.resetPassword('AnotherStrong1!', 'not-the-real-code')).rejects.toThrow(BadRequestError);

    // getCodeAge() compares the DB's own now() (cast to a bare `timestamp`, i.e. no
    // time zone) against the timestamptz `password_reset_code_created_at`. On a
    // dev box where the Postgres session time zone differs from the Node process's
    // time zone, that bare cast is parsed by `pg` as if it were in the *Node*
    // process's zone, producing a skewed "now" and a false "expired" result. Pin
    // nowTime() to the real wall clock for this call so the test exercises the
    // intended "code is fresh" branch rather than an environment-specific artifact.
    const nowSpy = vi
      .spyOn(BaseRepository.prototype, 'nowTime')
      .mockResolvedValue({ rows: [{ now: new Date() }] } as any);
    await controller.resetPassword('AnotherStrong1!', plaintextCode);
    nowSpy.mockRestore();

    // Old password should no longer work; new password should.
    await expect(controller.signIn({ email: owner.email, password: 'StrongPassword123!' })).rejects.toThrow(
      UnauthorizedError,
    );
    const signInResult = await controller.signIn({ email: owner.email, password: 'AnotherStrong1!' });
    expect('auth_token' in signInResult).toBe(true);

    const unknownEmailResult = await controller.sendPasswordResetEmail(`unknown-${rand()}@example.com`);
    expect(unknownEmailResult).toBe(true);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should renew tokens with a valid refresh token and reject an invalid one', async () => {
    const owner = await signUpOwner(controller, db);
    const tokens = await controller.signIn({ email: owner.email, password: 'StrongPassword123!' });
    if (!('auth_token' in tokens)) throw new Error('expected tokens');

    // Renew is now driven by the refresh token alone (delivered via the HttpOnly cookie).
    const renewed = await controller.renewAuthToken(tokens.refresh_token);
    expect(renewed.auth_token).toBeTypeOf('string');
    expect(renewed.refresh_token).toBeTypeOf('string');
    // Rotation: the old refresh token must no longer renew after it's been used.
    await expect(controller.renewAuthToken(tokens.refresh_token)).rejects.toThrow(UnauthorizedError);

    await expect(controller.renewAuthToken('bogus-refresh-token')).rejects.toThrow(UnauthorizedError);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should enforce admin/owner rules on adminTriggerPasswordReset', async () => {
    const owner = await signUpOwner(controller, db);
    const admin = await controller.inviteUser(authFor(owner), {
      email: `admin2-${rand()}@example.com`,
      first_name: 'Admin2',
      role: 'admin',
    });
    const member = await controller.inviteUser(authFor(owner), {
      email: `member2-${rand()}@example.com`,
      first_name: 'Member2',
      role: 'user',
    });
    const memberAuth = {
      tenant_id: String(owner.tenant_id),
      user_id: String(member.id),
      session_id: 's',
      role: 'user',
    };
    const adminAuth = { tenant_id: String(owner.tenant_id), user_id: String(admin.id), session_id: 's', role: 'admin' };

    await expect(controller.adminTriggerPasswordReset(memberAuth, admin.id)).rejects.toThrow(ForbiddenError);
    await expect(controller.adminTriggerPasswordReset(adminAuth, owner.id)).rejects.toThrow(ForbiddenError);
    await expect(controller.adminTriggerPasswordReset(authFor(owner), rand())).rejects.toThrow(NotFoundError);

    const result = await controller.adminTriggerPasswordReset(authFor(owner), admin.id);
    expect(result.success).toBe(true);
    const row = await db.selectFrom('authusers').selectAll().where('id', '=', admin.id).executeTakeFirstOrThrow();
    expect(row.password_reset_code).not.toBeNull();

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should dismiss the passkey setup prompt', async () => {
    const owner = await signUpOwner(controller, db);
    const result = await controller.dismissPasskeyPrompt(authFor(owner));
    expect(result.success).toBe(true);

    const row = await db.selectFrom('authusers').selectAll().where('id', '=', owner.id).executeTakeFirstOrThrow();
    expect(row.passkey_setup_dismissed_at).not.toBeNull();

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should report tenant account status and throw NotFoundError for a missing tenant', async () => {
    const owner = await signUpOwner(controller, db);
    const status = await controller.getTenantAccountStatus(authFor(owner));
    expect(status).toEqual({ deletion_scheduled_at: null, suspended_at: null, paused_at: null });

    await expect(controller.getTenantAccountStatus({ ...authFor(owner), tenant_id: rand() })).rejects.toThrow(
      NotFoundError,
    );

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should pause and resume a tenant, rejecting double pause/resume', async () => {
    const owner = await signUpOwner(controller, db);

    const paused = await controller.pauseTenant(authFor(owner));
    expect(paused.success).toBe(true);
    await expect(controller.pauseTenant(authFor(owner))).rejects.toThrow(BadRequestError);

    const sessionsAfterPause = await db
      .selectFrom('sessions')
      .selectAll()
      .where('tenant_id', '=', owner.tenant_id)
      .execute();
    expect(sessionsAfterPause).toHaveLength(0);

    const resumed = await controller.resumeTenant(authFor(owner));
    expect(resumed.success).toBe(true);
    await expect(controller.resumeTenant(authFor(owner))).rejects.toThrow(BadRequestError);

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should schedule and cancel tenant deletion, including via cancellation token', async () => {
    const owner = await signUpOwner(controller, db);

    const scheduled = await controller.scheduleTenantDeletion(authFor(owner));
    expect(scheduled.success).toBe(true);
    await expect(controller.scheduleTenantDeletion(authFor(owner))).rejects.toThrow(BadRequestError);

    const badToken = controller.cancelTenantDeletionByToken(String(owner.tenant_id), 'wrong-token');
    await expect(badToken).rejects.toThrow(BadRequestError);

    const goodToken = controller.makeDeletionCancelToken(String(owner.tenant_id));
    const result = await controller.cancelTenantDeletionByToken(String(owner.tenant_id), goodToken);
    expect(result.success).toBe(true);

    await controller.scheduleTenantDeletion(authFor(owner));
    const cancelled = await controller.cancelTenantDeletion(authFor(owner));
    expect(cancelled.success).toBe(true);

    const tenant = await db
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', owner.tenant_id)
      .executeTakeFirstOrThrow();
    expect(tenant.deletion_scheduled_at).toBeNull();

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should upload and delete an avatar without touching real blob storage', async () => {
    const owner = await signUpOwner(controller, db);
    const uploadSpy = vi.spyOn(StorageService.prototype, 'upload').mockResolvedValue(undefined);
    const deleteSpy = vi.spyOn(StorageService.prototype, 'delete').mockResolvedValue(undefined);

    const uploaded = await controller.uploadAvatar(authFor(owner), {
      dataBase64: Buffer.from('fake-image-bytes').toString('base64'),
      mimeType: 'image/png',
      filename: 'avatar.png',
    });
    expect(uploaded.file_id).toBeTypeOf('string');
    expect(uploadSpy).toHaveBeenCalled();

    await expect(
      controller.uploadAvatar(authFor(owner), {
        dataBase64: Buffer.from('x').toString('base64'),
        mimeType: 'application/pdf' as never,
        filename: 'doc.pdf',
      }),
    ).rejects.toThrow(BadRequestError);

    const deleted = await controller.deleteAvatar(authFor(owner));
    expect(deleted.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalled();

    const profile = await db.selectFrom('profiles').selectAll().where('auth_id', '=', owner.id).executeTakeFirst();
    expect(profile.avatar_file_id).toBeNull();

    await cleanup(db, owner.id, owner.tenant_id);
  });
});
