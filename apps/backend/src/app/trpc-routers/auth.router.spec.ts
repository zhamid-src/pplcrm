/**
 * Unit tests for `AuthRouter` ensuring authentication procedures
 * delegate to the underlying controller and return expected results.
 */
import { AuthController } from '../controllers/auth.controller';
import { AuthRouter } from './auth.router';

/** Test suite for authentication router procedures. */
describe('AuthRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof AuthRouter.createCaller>;

  /** Mock controller methods and create a router caller. */
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

  /** Restore all mocked controller methods. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /** Verifies the sign-up procedure returns the expected result. */
  it('signs up', async () => {
    await expect(
      caller.signUp({ organization: 'Org', email: 'a@b.com', password: 'password1', first_name: 'A' }),
    ).resolves.toEqual({ ok: true });
  });

  /** Verifies the sign-in procedure returns an auth token. */
  it('signs in', async () => {
    await expect(caller.signIn({ email: 'a@b.com', password: 'password1' })).resolves.toEqual({ auth_token: 'a' });
  });

  /** Ensures sign-out returns a success flag. */
  it('signs out', async () => {
    await expect(caller.signOut()).resolves.toBeTruthy();
  });

  /** Retrieves the currently authenticated user. */
  it('gets current user', async () => {
    await expect(caller.currentUser()).resolves.toEqual({ id: '1' });
  });

  /** Tests the password reset workflow. */
  it('resets password', async () => {
    await expect(caller.resetPassword({ password: 'newpass1', code: '123' })).resolves.toBeUndefined();
  });

  /** Validates token renewal provides a new auth and refresh token. */
  it('renews auth token', async () => {
    await expect(caller.renewAuthToken({ auth_token: 'a', refresh_token: 'r' })).resolves.toEqual({ auth_token: 'a', refresh_token: 'r' });
  });

  /** Ensures a password reset email is sent. */
  it('sends password reset email', async () => {
    await expect(caller.sendPasswordResetEmail({ email: 'a@b.com' })).resolves.toBeTruthy();
  });
});
