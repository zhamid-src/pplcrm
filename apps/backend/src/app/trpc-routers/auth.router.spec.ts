import { AuthController } from '../controllers/auth.controller';
import { AuthRouter } from './auth.router';

describe('AuthRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof AuthRouter.createCaller>;

  beforeAll(() => {
    jest.spyOn(AuthController.prototype, 'signUp').mockResolvedValue({ ok: true } as any);
    jest.spyOn(AuthController.prototype, 'signIn').mockResolvedValue({ auth_token: 'a' } as any);
    jest.spyOn(AuthController.prototype, 'signOut').mockResolvedValue(true as any);
    jest.spyOn(AuthController.prototype, 'currentUser').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(AuthController.prototype, 'resetPassword').mockResolvedValue(undefined as any);
    jest
      .spyOn(AuthController.prototype, 'renewAuthToken')
      .mockResolvedValue({ auth_token: 'a', refresh_token: 'r' } as any);
    jest
      .spyOn(AuthController.prototype, 'sendPasswordResetEmail')
      .mockResolvedValue(true as any);
    caller = AuthRouter.createCaller(ctx);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('signs up', async () => {
    await expect(
      caller.signUp({ organization: 'Org', email: 'a@b.com', password: 'password1', first_name: 'A' }),
    ).resolves.toEqual({ ok: true });
  });

  it('signs in', async () => {
    await expect(caller.signIn({ email: 'a@b.com', password: 'password1' })).resolves.toEqual({ auth_token: 'a' });
  });

  it('signs out', async () => {
    await expect(caller.signOut()).resolves.toBeTruthy();
  });

  it('gets current user', async () => {
    await expect(caller.currentUser()).resolves.toEqual({ id: '1' });
  });

  it('resets password', async () => {
    await expect(caller.resetPassword({ password: 'newpass1', code: '123' })).resolves.toBeUndefined();
  });

  it('renews auth token', async () => {
    await expect(caller.renewAuthToken({ auth_token: 'a', refresh_token: 'r' })).resolves.toEqual({ auth_token: 'a', refresh_token: 'r' });
  });

  it('sends password reset email', async () => {
    await expect(caller.sendPasswordResetEmail({ email: 'a@b.com' })).resolves.toBeTruthy();
  });
});
