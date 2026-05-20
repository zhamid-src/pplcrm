import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthRouter } from './trpc.router';
import { AuthController } from './controller';

describe('AuthRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
    await db.deleteFrom('profiles').where('auth_id', '=', creator.id).execute();
    await db.deleteFrom('tenants').where('id', '=', creator.tenant_id).execute();
    await db.deleteFrom('authusers').where('id', '=', creator.id).execute();
  });
});
