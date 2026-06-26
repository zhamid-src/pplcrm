import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthRouter } from './trpc.router';
import { AuthController } from './controller';
import { generateToken, hashToken } from '../../lib/token-hash';
import { BaseRepository } from '../../lib/base.repo';

vi.mock('../../lib/hibp', () => ({
  getPwnedCount: vi.fn().mockResolvedValue(0),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockAuthDb() {
  const mockQB: any = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ role: 'owner', verified: true }),
  };
  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn().mockReturnValue(mockQB),
  } as any);
}

async function cleanup(db: any, user_id: any, tenant_id: any) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('admin_id', '=', user_id)
    .execute();

  await db.deleteFrom('map_lists_persons').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('map_teams_persons').where('tenant_id', '=', tenant_id).execute();

  await db.deleteFrom('persons').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenant_id).execute();

  const tenantUserIds = db.selectFrom('authusers').select('id').where('tenant_id', '=', tenant_id);

  // Cannot delete the user from auth without deleting all references
  // Deleting the user should just cascade
  await db.deleteFrom('profiles').where('auth_id', 'in', tenantUserIds).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('lists').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('tasks').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('newsletters').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('teams').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('volunteer_events').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('web_forms').where('tenant_id', '=', tenant_id).execute();

  await db.deleteFrom('sessions').where('user_id', 'in', tenantUserIds).execute();

  // Null out self-referential FKs so we can delete all tenant users at once.
  await db
    .updateTable('authusers')
    .set({ createdby_id: null, updatedby_id: null })
    .where('tenant_id', '=', tenant_id)
    .execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenant_id).execute();

  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('map_households_tags').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenant_id).execute();
  await db.deleteFrom('tenants').where('id', '=', tenant_id).execute();
}

describe('AuthRouter', () => {
  beforeEach(() => {
    mockAuthDb();
  });

  it('should call currentUser on the controller', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const spy = vi.spyOn(AuthController.prototype, 'currentUser').mockResolvedValue(mockUser as any);

    const caller = AuthRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);
    const result = await caller.currentUser();

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockUser);
  });

  it('should call signIn on the controller', async () => {
    const mockTokens = { auth_token: 'abc', refresh_token: 'def' };
    const spy = vi.spyOn(AuthController.prototype, 'signIn').mockResolvedValue(mockTokens as any);

    const caller = AuthRouter.createCaller({} as any);
    const result = await caller.signIn({ email: 'test@example.com', password: 'password123' });

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockTokens);
  });

  it('should call signUp on the controller', async () => {
    const mockTokens = { auth_token: 'signup-auth-token', refresh_token: 'signup-refresh-token' };
    const spy = vi.spyOn(AuthController.prototype, 'signUp').mockResolvedValue(mockTokens as any);

    const caller = AuthRouter.createCaller({} as any);
    const signUpData = {
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      first_name: 'John',
      organization: 'New Org',
    };
    const result = await caller.signUp(signUpData);

    expect(spy).toHaveBeenCalledWith(signUpData);
    expect(result).toEqual(mockTokens);
  });
});

describe('AuthController Integration', () => {
  it('should sign up a user, create their tenant and profile, and handle email conflicts', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const email = `test-integration-${Date.now()}@example.com`;
    const orgName = `Org-${Date.now()}`;

    const controller = new AuthController();

    // 1. Sign up a new user
    const token = await controller.signUp({
      organization: orgName,
      email,
      password: 'StrongPassword123!',
      first_name: 'Integration',
    });

    expect(token).toBeDefined();
    expect(token.auth_token).toBeTypeOf('string');
    expect(token.refresh_token).toBeTypeOf('string');

    // 2. Verify database records are correctly inserted and associated
    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirst();
    expect(user).toBeDefined();
    expect(user?.first_name).toBe('Integration');

    const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', user?.tenant_id).executeTakeFirst();
    expect(tenant).toBeDefined();
    expect(tenant?.name).toBe(orgName);

    const profile = await db.selectFrom('profiles').selectAll().where('auth_id', '=', user?.id).executeTakeFirst();
    expect(profile).toBeDefined();

    // 3. Verify that trying to sign up again with the same email throws ConflictError
    const { ConflictError } = await import('../../errors/app-errors');
    await expect(
      controller.signUp({
        organization: orgName,
        email,
        password: 'StrongPassword123!',
        first_name: 'Integration',
      }),
    ).rejects.toThrow(ConflictError);

    if (user) {
      await cleanup(db, user.id, user.tenant_id);
    }
  });

  it('should invite a user, create profile and sanitize response', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const creatorEmail = `creator-${Date.now()}@example.com`;
    const tokens = await controller.signUp({
      organization: `Org-Invite-${Date.now()}`,
      email: creatorEmail,
      password: 'StrongPassword123!',
      first_name: 'Creator',
    });

    const creator = await db.selectFrom('authusers').selectAll().where('email', '=', creatorEmail).executeTakeFirst();
    expect(creator).toBeDefined();

    const authPayload = {
      tenant_id: creator.tenant_id,
      user_id: creator.id,
      session_id: 'dummy-session-id',
    };

    const inviteEmail = `invited-${Date.now()}@example.com`;

    const result = await controller.inviteUser(authPayload, {
      email: inviteEmail,
      first_name: 'InvitedFirstName',
      last_name: 'InvitedLastName',
      role: 'admin',
    });

    expect(result).toBeDefined();
    expect(result.email).toBe(inviteEmail);
    expect(result.first_name).toBe('InvitedFirstName');

    await cleanup(db, creator.id, creator.tenant_id);
  });

  it('should update a user, sync profile, and sanitize response without non-existent column errors', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const userEmail = `update-user-${Date.now()}@example.com`;
    await controller.signUp({
      organization: `Org-Update-${Date.now()}`,
      email: userEmail,
      password: 'StrongPassword123!',
      first_name: 'UpdateTest',
    });

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', userEmail).executeTakeFirstOrThrow();

    const authPayload = {
      tenant_id: user.tenant_id,
      user_id: user.id,
      session_id: 'dummy-session-id',
    };

    // Update first_name and last_name (which triggers profile sync)
    const result = await controller.updateUser(authPayload, user.id, {
      first_name: 'Baba',
      last_name: 'Ganoush',
      role: 'owner',
    });

    expect(result).toBeDefined();
    expect(result.first_name).toBe('Baba');
    expect(result.last_name).toBe('Ganoush');
    expect(result.role).toBe('owner');
    expect(result.verified).toBe(false);

    await cleanup(db, user.id, user.tenant_id);
  });

  it('should create a default campaign and default settings on sign-up', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const email = `test-settings-${Date.now()}@example.com`;
    const orgName = `Org-Settings-${Date.now()}`;

    const controller = new AuthController();

    // Sign up new user
    const token = await controller.signUp({
      organization: orgName,
      email,
      password: 'StrongPassword123!',
      first_name: 'SettingsTest',
    });

    expect(token).toBeDefined();

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();

    // 1. Verify default campaign was created
    const campaign = await db
      .selectFrom('campaigns')
      .selectAll()
      .where('tenant_id', '=', user.tenant_id)
      .executeTakeFirst();

    expect(campaign).toBeDefined();
    expect(campaign?.name).toBe(`${orgName} Campaign`);
    expect(campaign?.admin_id).toBe(user.id);
    expect(campaign?.createdby_id).toBe(user.id);

    // 2. Verify settings were created
    const settings = await db.selectFrom('settings').selectAll().where('tenant_id', '=', user.tenant_id).execute();

    expect(settings).toHaveLength(2);

    const currentCampaignSetting = settings.find((s) => s.key === 'current_campaign');
    expect(currentCampaignSetting).toBeDefined();
    expect(currentCampaignSetting?.value).toEqual({ id: Number(campaign?.id) });
    expect(currentCampaignSetting?.createdby_id).toBe(user.id);
    expect(currentCampaignSetting?.updatedby_id).toBe(user.id);

    const notificationsSetting = settings.find((s) => s.key === 'notifications');
    expect(notificationsSetting).toBeDefined();
    expect(notificationsSetting?.value).toBe(false);
    expect(notificationsSetting?.createdby_id).toBe(user.id);
    expect(notificationsSetting?.updatedby_id).toBe(user.id);

    await cleanup(db, user.id, user.tenant_id);
  });

  it('should generate valid JWT tokens during sign-up that can be verified by verifyAuthToken', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const { verifyAuthToken } = await import('../../lib/auth-util');
    const db = (BaseRepository as any)._db;

    const email = `test-jwt-${Date.now()}@example.com`;
    const orgName = `Org-JWT-${Date.now()}`;
    const controller = new AuthController();

    const tokens = await controller.signUp({
      organization: orgName,
      email,
      password: 'StrongPassword123!',
      first_name: 'JWTVerificationTest',
    });

    expect(tokens).toBeDefined();
    expect(tokens.auth_token).toBeTypeOf('string');

    const payload = await verifyAuthToken(tokens.auth_token);
    expect(payload).toBeDefined();
    expect(payload.name).toBe('JWTVerificationTest');

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();

    await cleanup(db, user.id, user.tenant_id);
  });

  it('should enqueue a send-transactional-email background job during signup and invite', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const email = `test-enqueue-${Date.now()}@example.com`;
    const orgName = `Org-Enqueue-${Date.now()}`;

    // Sign up a user
    const token = await controller.signUp({
      organization: orgName,
      email,
      password: 'StrongPassword123!',
      first_name: 'EnqueueUser',
    });

    expect(token).toBeDefined();

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();

    // Verify background job was enqueued
    const signupJob = await db
      .selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', user.tenant_id)
      .executeTakeFirst();

    expect(signupJob).toBeDefined();
    expect(signupJob.status).toBe('pending');
    expect(signupJob.max_attempts).toBe(5);

    const payload = typeof signupJob.payload === 'string' ? JSON.parse(signupJob.payload) : signupJob.payload;
    expect(payload.type).toBe('send-transactional-email');
    expect(payload.to).toBe(email);
    expect(payload.subject).toContain('Welcome to CampaignRaven');

    await cleanup(db, user.id, user.tenant_id);
  });

  it('should schedule and cancel account deletion, and automatically cancel on login', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const email = `del-${Date.now()}@example.com`;
    await controller.signUp({
      organization: `Org-Del-${Date.now()}`,
      email,
      password: 'StrongPassword123!',
      first_name: 'DeleteUser',
    });

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();
    await db.updateTable('authusers').set({ verified: true }).where('id', '=', user.id).execute();
    const authPayload = {
      tenant_id: String(user.tenant_id),
      user_id: String(user.id),
      session_id: 'dummy-del-session',
      name: user.first_name,
    };

    // 1. Schedule Deletion
    const schedResult = await controller.scheduleAccountDeletion(authPayload);
    expect(schedResult.success).toBe(true);
    expect(schedResult.deletion_scheduled_at).toBeDefined();

    const scheduledUser = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirstOrThrow();
    expect(scheduledUser.deletion_scheduled_at).not.toBeNull();

    // 2. Cancel Deletion
    const cancelResult = await controller.cancelAccountDeletion(authPayload);
    expect(cancelResult.success).toBe(true);

    const cancelledUser = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirstOrThrow();
    expect(cancelledUser.deletion_scheduled_at).toBeNull();

    // 3. Re-schedule and verify sign-in clears it
    await controller.scheduleAccountDeletion(authPayload);
    const reScheduled = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirstOrThrow();
    expect(reScheduled.deletion_scheduled_at).not.toBeNull();

    // Sign in (mocking matching UA/IP to bypass 2FA check)
    await db
      .insertInto('sessions')
      .values({
        session_id: hashToken(generateToken()),
        refresh_token: hashToken(generateToken()),
        user_id: user.id,
        tenant_id: user.tenant_id,
        ip_address: '127.0.0.1',
        user_agent: 'Vitest',
        status: 'active',
      })
      .execute();

    await controller.signIn({ email, password: 'StrongPassword123!' }, '127.0.0.1', 'Vitest');

    const signedInUser = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirstOrThrow();
    expect(signedInUser.deletion_scheduled_at).toBeNull();

    await cleanup(db, user.id, user.tenant_id);
  });

  it('should trigger 2FA login verification code and verify successfully', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const email = `2fa-${Date.now()}@example.com`;
    await controller.signUp({
      organization: `Org-2fa-${Date.now()}`,
      email,
      password: 'StrongPassword123!',
      first_name: '2faUser',
    });

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();
    await db.updateTable('authusers').set({ verified: true }).where('id', '=', user.id).execute();

    // Enable 2FA on the user
    await db.updateTable('authusers').set({ two_factor_enabled: true }).where('id', '=', user.id).execute();

    // Attempt sign-in
    const signInResult = (await controller.signIn(
      { email, password: 'StrongPassword123!' },
      '127.0.0.1',
      'Vitest',
    )) as any;
    expect(signInResult).toEqual({ requires2FA: true, email });

    const userWithOtp = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirstOrThrow();
    expect(userWithOtp.two_factor_code).toBeTypeOf('string');
    expect(userWithOtp.two_factor_code).toHaveLength(6);

    // Verify OTP
    const verifyResult = await controller.verify2FA(email, userWithOtp.two_factor_code!, '127.0.0.1', 'Vitest');
    expect(verifyResult.auth_token).toBeTypeOf('string');
    expect(verifyResult.refresh_token).toBeTypeOf('string');

    await cleanup(db, user.id, user.tenant_id);
  });

  it('should enforce role rules and owner constraints', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const { ForbiddenError, BadRequestError } = await import('../../errors/app-errors');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();

    // 1. Sign up Owner
    const emailOwner = `owner-${Date.now()}@example.com`;
    const tokensOwner = await controller.signUp({
      organization: `RoleOrg-${Date.now()}`,
      email: emailOwner,
      password: 'StrongPassword123!',
      first_name: 'OwnerUser',
    });

    const owner = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', emailOwner)
      .executeTakeFirstOrThrow();
    // Creator must be owner
    expect(owner.role).toBe('owner');

    // Force verify the owner
    await db.updateTable('authusers').set({ verified: true }).where('id', '=', owner.id).execute();

    const authOwner = {
      tenant_id: owner.tenant_id,
      user_id: owner.id,
      session_id: 's-owner',
      role: 'owner',
      name: owner.first_name,
    };

    // 2. Invite Admin
    const emailAdmin = `admin-${Date.now()}@example.com`;
    await controller.inviteUser(authOwner, {
      email: emailAdmin,
      first_name: 'AdminUser',
      role: 'admin',
    });

    const admin = await db
      .selectFrom('authusers')
      .selectAll()
      .where('email', '=', emailAdmin)
      .executeTakeFirstOrThrow();
    const authAdmin = {
      tenant_id: owner.tenant_id,
      user_id: admin.id,
      session_id: 's-admin',
      role: 'admin',
      name: admin.first_name,
    };

    // 3. Invite User
    const emailUser = `user-${Date.now()}@example.com`;
    await controller.inviteUser(authOwner, {
      email: emailUser,
      first_name: 'NormalUser',
      role: 'user',
    });

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', emailUser).executeTakeFirstOrThrow();
    const authUser = {
      tenant_id: owner.tenant_id,
      user_id: user.id,
      session_id: 's-user',
      role: 'user',
      name: user.first_name,
    };

    // Rule: User cannot update another user
    await expect(controller.updateUser(authUser, admin.id, { first_name: 'Hacked' })).rejects.toThrow(ForbiddenError);

    // Rule: User cannot change their own role or verified status
    await expect(controller.updateUser(authUser, user.id, { role: 'owner' })).rejects.toThrow(ForbiddenError);

    // Rule: Admin cannot demote owner
    await expect(controller.updateUser(authAdmin, owner.id, { role: 'user' })).rejects.toThrow(ForbiddenError);

    // Rule: Admin cannot remove access of owner
    await expect(controller.updateUser(authAdmin, owner.id, { verified: false })).rejects.toThrow(ForbiddenError);

    // Rule: Admin cannot promote non-owner to owner
    await expect(controller.updateUser(authAdmin, user.id, { role: 'owner' })).rejects.toThrow(ForbiddenError);

    // Rule: Admin cannot trigger password reset for owner
    await expect(controller.adminTriggerPasswordReset(authAdmin, owner.id)).rejects.toThrow(ForbiddenError);

    // Rule: Owner leaving -> oldest remaining user becomes owner
    // Since Owner leaves (demotes themselves to admin), and we have two other users:
    // Admin (invited first, created earlier) and User (invited second, created later).
    // Admin should become Owner, and Owner should become Admin.
    await controller.updateUser(authOwner, owner.id, { role: 'admin' });

    const ownerAfterLeave = await db
      .selectFrom('authusers')
      .selectAll()
      .where('id', '=', owner.id)
      .executeTakeFirstOrThrow();
    const adminAfterLeave = await db
      .selectFrom('authusers')
      .selectAll()
      .where('id', '=', admin.id)
      .executeTakeFirstOrThrow();

    expect(ownerAfterLeave.role).toBe('admin');
    expect(adminAfterLeave.role).toBe('owner'); // Oldest user got promoted to owner!

    await cleanup(db, owner.id, owner.tenant_id);
  });

  it('should enforce verification logic: block sign-in for unverified, reject manual changes, set verified false on email change, and clear sessions', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const { ForbiddenError } = await import('../../errors/app-errors');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const email = `test-verif-${Date.now()}@example.com`;

    // 1. Sign up (creates as unverified by default)
    await controller.signUp({
      organization: `VerifOrg-${Date.now()}`,
      email,
      password: 'StrongPassword123!',
      first_name: 'VerifUser',
    });

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();
    expect(user.verified).toBe(false);

    // 2. Try to sign in while unverified -> should throw ForbiddenError
    await expect(controller.signIn({ email, password: 'StrongPassword123!' }, '127.0.0.1', 'Vitest')).rejects.toThrow(
      ForbiddenError,
    );

    // 3. Manually trying to set verified: true via updateUser -> should throw ForbiddenError
    const authPayload = {
      tenant_id: String(user.tenant_id),
      user_id: String(user.id),
      session_id: 'verif-session',
      role: 'owner',
    };
    await expect(controller.updateUser(authPayload, user.id, { verified: true })).rejects.toThrow(ForbiddenError);

    // 4. Force verify in database to simulate clicking verification link
    await db.updateTable('authusers').set({ verified: true }).where('id', '=', user.id).execute();

    // Now sign in should work
    const signInResult = await controller.signIn({ email, password: 'StrongPassword123!' }, '127.0.0.1', 'Vitest');
    expect(signInResult).toBeDefined();

    // Invite an admin to act as the other user
    const invitedUser = await controller.inviteUser(authPayload, {
      email: `invited-admin-${Date.now()}@example.com`,
      first_name: 'OtherAdmin',
      last_name: 'User',
      role: 'admin',
    });

    // 5. Change email via updateUser -> should set verified: false and clear sessions
    const nextEmail = `next-${Date.now()}@example.com`;
    const otherAuthPayload = {
      tenant_id: String(user.tenant_id),
      user_id: String(invitedUser.id),
      session_id: 'verif-session',
      role: 'admin',
    };
    const updateResult = await controller.updateUser(otherAuthPayload, user.id, { email: nextEmail });
    expect(updateResult.verified).toBe(false);

    const userAfterUpdate = await db
      .selectFrom('authusers')
      .selectAll()
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow();
    expect(userAfterUpdate.email).toBe(nextEmail);
    expect(userAfterUpdate.verified).toBe(false);

    // Verify session was deleted
    const session = await db.selectFrom('sessions').selectAll().where('user_id', '=', user.id).executeTakeFirst();
    expect(session).toBeUndefined();

    await cleanup(db, user.id, user.tenant_id);

    await db
      .updateTable('authusers')
      .set({ updatedby_id: null, createdby_id: null })
      .where('id', '=', invitedUser.id)
      .execute();
    await db.deleteFrom('profiles').where('auth_id', '=', invitedUser.id).execute();
    await db.deleteFrom('authusers').where('id', '=', invitedUser.id).execute();
  });

  it('should handle self-email changes, role-shifting to viewer, cancel/undo, and email verification restoration', async () => {
    const { BaseRepository } = await import('../../lib/base.repo');
    const db = (BaseRepository as any)._db;

    const controller = new AuthController();
    const email = `self-change-${Date.now()}@example.com`;

    // 1. Sign up a user
    await controller.signUp({
      organization: `SelfChangeOrg-${Date.now()}`,
      email,
      password: 'StrongPassword123!',
      first_name: 'SelfUser',
    });

    const user = await db.selectFrom('authusers').selectAll().where('email', '=', email).executeTakeFirstOrThrow();
    // Verify initially
    await db.updateTable('authusers').set({ verified: true, role: 'owner' }).where('id', '=', user.id).execute();

    const testSessionId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const hashedTestSessionId = hashToken(testSessionId);
    // Clean up any stray session from previous failures
    await db.deleteFrom('sessions').where('session_id', '=', hashedTestSessionId).execute();
    // Create a mock active session — store the *hash* in DB, keep plaintext in auth payload
    await db
      .insertInto('sessions')
      .values({
        session_id: hashedTestSessionId,
        refresh_token: hashToken(generateToken()),
        user_id: user.id,
        tenant_id: user.tenant_id,
        ip_address: '127.0.0.1',
        user_agent: 'Vitest',
        status: 'active',
      })
      .execute();

    const authPayload = {
      tenant_id: String(user.tenant_id),
      user_id: String(user.id),
      session_id: testSessionId,
      role: 'owner',
    };

    // 2. Change own email
    const newEmail = `self-new-${Date.now()}@example.com`;
    const updateResult = await controller.updateUser(authPayload, user.id, { email: newEmail });

    expect(updateResult.email).toBe(newEmail);
    expect(updateResult.role).toBe('viewer');
    expect(updateResult.previous_email).toBe(email);
    expect(updateResult.previous_role).toBe('owner');
    expect(updateResult.verified).toBe(false);

    // Verify session was NOT deleted
    const session = await db.selectFrom('sessions').selectAll().where('user_id', '=', user.id).executeTakeFirst();
    expect(session).toBeDefined();

    // 3. Test cancel/undo
    const cancelResult = await controller.cancelEmailChange(authPayload);
    expect(cancelResult.success).toBe(true);

    const userAfterCancel = await db
      .selectFrom('authusers')
      .selectAll()
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow();
    expect(userAfterCancel.email).toBe(email);
    expect(userAfterCancel.role).toBe('owner');
    expect(userAfterCancel.verified).toBe(true);
    expect(userAfterCancel.previous_email).toBeNull();
    expect(userAfterCancel.previous_role).toBeNull();

    // 4. Set email to new email again to test verification
    const newEmail2 = `self-new2-${Date.now()}@example.com`;

    // Capture the plaintext reset code before it is hashed for storage.
    // The DB now stores SHA-256 hashes; the plaintext is only returned once from the method.
    const { AuthUsersRepo } = await import('./repositories/authusers.repo');
    let plaintextCode: string | undefined;
    const origAddCode = AuthUsersRepo.prototype.addPasswordResetCode;
    const spy = vi.spyOn(AuthUsersRepo.prototype, 'addPasswordResetCode').mockImplementation(async function (
      this: any,
      ...args: any[]
    ) {
      const result = await origAddCode.apply(this, args as any);
      plaintextCode = result?.password_reset_code;
      return result;
    });

    await controller.updateUser(authPayload, user.id, { email: newEmail2 });
    spy.mockRestore();

    expect(plaintextCode).toBeDefined();
    const code = plaintextCode!;

    // Verify code
    const verifyResult = await controller.verifyEmail(code);
    expect(verifyResult.success).toBe(true);

    const userAfterVerify = await db
      .selectFrom('authusers')
      .selectAll()
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow();
    expect(userAfterVerify.email).toBe(newEmail2);
    expect(userAfterVerify.role).toBe('owner'); // role is restored to owner!
    expect(userAfterVerify.verified).toBe(true);
    expect(userAfterVerify.previous_email).toBeNull();
    expect(userAfterVerify.previous_role).toBeNull();

    await cleanup(db, user.id, user.tenant_id);
  });
});
