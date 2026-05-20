import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthRouter } from './trpc.router';
import { AuthController } from './controller';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AuthRouter', () => {
  it('should call currentUser on the controller', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const spy = vi.spyOn(AuthController.prototype, 'currentUser').mockResolvedValue(mockUser as any);
    
    const caller = AuthRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
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
      })
    ).rejects.toThrow(ConflictError);

    // Clean up
    if (user) {
      await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('admin_id', '=', user.id).execute();
      await db.deleteFrom('tags').where('createdby_id', '=', user.id).execute();
      await db.deleteFrom('settings').where('tenant_id', '=', user.tenant_id).execute();
      await db.deleteFrom('campaigns').where('tenant_id', '=', user.tenant_id).execute();
      await db.deleteFrom('profiles').where('auth_id', '=', user.id).execute();
      await db.deleteFrom('sessions').where('user_id', '=', user.id).execute();
      await db.deleteFrom('tenants').where('id', '=', user.tenant_id).execute();
      await db.deleteFrom('authusers').where('id', '=', user.id).execute();
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

    // Clean up
    await db.deleteFrom('profiles').where('auth_id', '=', result.id).execute();
    await db.deleteFrom('authusers').where('id', '=', result.id).execute();
    await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('admin_id', '=', creator.id).execute();
    await db.deleteFrom('tags').where('tenant_id', '=', creator.tenant_id).execute();
    await db.deleteFrom('settings').where('tenant_id', '=', creator.tenant_id).execute();
    await db.deleteFrom('campaigns').where('tenant_id', '=', creator.tenant_id).execute();
    await db.deleteFrom('profiles').where('auth_id', '=', creator.id).execute();
    await db.deleteFrom('tenants').where('id', '=', creator.tenant_id).execute();
    await db.deleteFrom('authusers').where('id', '=', creator.id).execute();
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
      role: 'admin',
      verified: true,
    });

    expect(result).toBeDefined();
    expect(result.first_name).toBe('Baba');
    expect(result.last_name).toBe('Ganoush');
    expect(result.role).toBe('admin');
    expect(result.verified).toBe(true);

    // Clean up
    await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('admin_id', '=', user.id).execute();
    await db.deleteFrom('tags').where('tenant_id', '=', user.tenant_id).execute();
    await db.deleteFrom('settings').where('tenant_id', '=', user.tenant_id).execute();
    await db.deleteFrom('campaigns').where('tenant_id', '=', user.tenant_id).execute();
    await db.deleteFrom('profiles').where('auth_id', '=', user.id).execute();
    await db.deleteFrom('tenants').where('id', '=', user.tenant_id).execute();
    await db.deleteFrom('authusers').where('id', '=', user.id).execute();
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
    const settings = await db
      .selectFrom('settings')
      .selectAll()
      .where('tenant_id', '=', user.tenant_id)
      .execute();

    expect(settings).toHaveLength(2);
    
    const currentCampaignSetting = settings.find(s => s.key === 'current_campaign');
    expect(currentCampaignSetting).toBeDefined();
    expect(currentCampaignSetting?.value).toEqual({ id: Number(campaign?.id) });
    expect(currentCampaignSetting?.createdby_id).toBe(user.id);
    expect(currentCampaignSetting?.updatedby_id).toBe(user.id);

    const notificationsSetting = settings.find(s => s.key === 'notifications');
    expect(notificationsSetting).toBeDefined();
    expect(notificationsSetting?.value).toBe(false);
    expect(notificationsSetting?.createdby_id).toBe(user.id);
    expect(notificationsSetting?.updatedby_id).toBe(user.id);

    // Clean up
    await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('admin_id', '=', user.id).execute();
    await db.deleteFrom('tags').where('tenant_id', '=', user.tenant_id).execute();
    await db.deleteFrom('settings').where('tenant_id', '=', user.tenant_id).execute();
    await db.deleteFrom('campaigns').where('tenant_id', '=', user.tenant_id).execute();
    await db.deleteFrom('profiles').where('auth_id', '=', user.id).execute();
    await db.deleteFrom('tenants').where('id', '=', user.tenant_id).execute();
    await db.deleteFrom('authusers').where('id', '=', user.id).execute();
  });
});
