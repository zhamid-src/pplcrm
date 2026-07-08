import { signal } from '@angular/core';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth-service';

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}));

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

describe('AuthService', () => {
  let service: AuthService;
  let mockApi: any;
  let mockTokenService: { set: ReturnType<typeof vi.fn>; clearAll: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const mockUser = { id: '1', email: 'a@b.com', role: 'admin' };

  beforeEach(() => {
    mockApi = {
      auth: {
        currentUser: { query: vi.fn() },
        uploadAvatar: { mutate: vi.fn() },
        deleteAvatar: { mutate: vi.fn() },
        cancelEmailChange: { mutate: vi.fn() },
        resetPassword: { mutate: vi.fn() },
        sendPasswordResetEmail: { mutate: vi.fn() },
        signIn: { mutate: vi.fn() },
        verify2FA: { mutate: vi.fn() },
        signOut: { mutate: vi.fn() },
        signUp: { mutate: vi.fn() },
        verifyEmail: { mutate: vi.fn() },
        resendVerificationEmail: { mutate: vi.fn() },
        checkEmail: { query: vi.fn() },
        passkeyAuthenticationOptions: { query: vi.fn() },
        verifyPasskeyAuthentication: { mutate: vi.fn() },
        passkeyRegistrationOptions: { query: vi.fn() },
        verifyPasskeyRegistration: { mutate: vi.fn() },
        listPasskeys: { query: vi.fn() },
        deletePasskey: { mutate: vi.fn() },
        dismissPasskeyPrompt: { mutate: vi.fn() },
        updatePasskeyName: { mutate: vi.fn() },
      },
    };
    mockTokenService = { set: vi.fn(), clearAll: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    // Create a bare instance without invoking Angular inject()s
    service = Object.create(AuthService.prototype) as AuthService;
    (service as any).api = mockApi;
    (service as any).tokenService = mockTokenService;
    (service as any).router = mockRouter;
    (service as any).user = signal(null);

    vi.clearAllMocks();
  });

  describe('getCurrentUser / getUser / getUserSignal', () => {
    it('stores and returns the user fetched from the api', async () => {
      mockApi.auth.currentUser.query.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(service.getUser()).toEqual(mockUser);
      expect(service.getUserSignal()()).toEqual(mockUser);
    });

    it('resolves to null and clears the user if the api call fails', async () => {
      mockApi.auth.currentUser.query.mockRejectedValue(new Error('network error'));

      const result = await service.getCurrentUser();

      expect(result).toBeNull();
      expect(service.getUser()).toBeNull();
    });

    it('init() delegates to getCurrentUser()', async () => {
      mockApi.auth.currentUser.query.mockResolvedValue(mockUser);

      await service.init();

      expect(mockApi.auth.currentUser.query).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('returns requires2FA without updating tokens when the server asks for a second factor', async () => {
      mockApi.auth.signIn.mutate.mockResolvedValue({ requires2FA: true, email: 'a@b.com' });

      const result = await service.signIn({ email: 'a@b.com', password: 'pw' } as any);

      expect(result).toEqual({ requires2FA: true, email: 'a@b.com' });
      expect(mockTokenService.set).not.toHaveBeenCalled();
    });

    it('stores the token and loads the current user on a normal sign-in', async () => {
      mockApi.auth.signIn.mutate.mockResolvedValue({ auth_token: 'a1', refresh_token: 'r1' });
      mockApi.auth.currentUser.query.mockResolvedValue(mockUser);

      const result = await service.signIn({ email: 'a@b.com', password: 'pw' } as any);

      expect(mockTokenService.set).toHaveBeenCalledWith({ auth_token: 'a1', refresh_token: 'r1' });
      expect(result).toEqual({ requires2FA: false, user: mockUser });
    });

    it('redirects to /cancel-deletion when the account is scheduled for deletion', async () => {
      mockApi.auth.signIn.mutate.mockResolvedValue({ auth_token: 'a1', refresh_token: 'r1' });
      mockApi.auth.currentUser.query.mockResolvedValue({ ...mockUser, tenant_deletion_scheduled_at: '2030-01-01' });

      await service.signIn({ email: 'a@b.com', password: 'pw' } as any);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cancel-deletion']);
    });

    it('redirects to /resume-account when the tenant is paused', async () => {
      mockApi.auth.signIn.mutate.mockResolvedValue({ auth_token: 'a1', refresh_token: 'r1' });
      mockApi.auth.currentUser.query.mockResolvedValue({ ...mockUser, tenant_paused_at: '2030-01-01' });

      await service.signIn({ email: 'a@b.com', password: 'pw' } as any);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/resume-account']);
    });
  });

  describe('verify2FA / updateTokensAndGetCurrentUser', () => {
    it('stores the returned token and resolves the current user', async () => {
      mockApi.auth.verify2FA.mutate.mockResolvedValue({ auth_token: 'a1', refresh_token: 'r1' });
      mockApi.auth.currentUser.query.mockResolvedValue(mockUser);

      const result = await service.verify2FA({ email: 'a@b.com', code: '123456' });

      expect(mockTokenService.set).toHaveBeenCalledWith({ auth_token: 'a1', refresh_token: 'r1' });
      expect(result).toEqual(mockUser);
    });

    it('throws when the api resolves a TRPCError', async () => {
      const error = new TRPCError({ code: 'UNAUTHORIZED', message: 'bad code' });
      mockApi.auth.verify2FA.mutate.mockResolvedValue(error);

      await expect(service.verify2FA({ email: 'a@b.com', code: 'bad' })).rejects.toBe(error);
      expect(mockTokenService.set).not.toHaveBeenCalled();
    });

    it('throws when the api resolves a falsy token', async () => {
      mockApi.auth.verify2FA.mutate.mockResolvedValue(null);

      await expect(service.verify2FA({ email: 'a@b.com', code: 'bad' })).rejects.toBeNull();
    });
  });

  describe('signOut', () => {
    it('clears the user, clears tokens, and navigates to /signin even if the api call fails', async () => {
      mockApi.auth.signOut.mutate.mockRejectedValue(new Error('network error'));
      (service as any).user.set(mockUser);

      const result = await service.signOut();

      expect(result).toBeNull();
      expect(service.getUser()).toBeNull();
      expect(mockTokenService.clearAll).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin']);
    });

    it('returns the api response on success', async () => {
      mockApi.auth.signOut.mutate.mockResolvedValue({ success: true });

      const result = await service.signOut();

      expect(result).toEqual({ success: true });
    });
  });

  describe('avatar management', () => {
    it('uploadAvatar strips the data-url prefix before sending, and updates the cached user', async () => {
      (service as any).user.set(mockUser);
      mockApi.auth.uploadAvatar.mutate.mockResolvedValue({ avatar_url: 'https://cdn/avatar.png' });
      const file = new File(['hello'], 'avatar.png', { type: 'image/png' });

      const result = await service.uploadAvatar(file);

      expect(mockApi.auth.uploadAvatar.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: 'image/png', filename: 'avatar.png' }),
      );
      expect(result).toEqual({ avatar_url: 'https://cdn/avatar.png' });
      expect(service.getUser()).toEqual({ ...mockUser, avatar_url: 'https://cdn/avatar.png' });
    });

    it('deleteAvatar clears the cached avatar_url', async () => {
      (service as any).user.set({ ...mockUser, avatar_url: 'https://cdn/avatar.png' });
      mockApi.auth.deleteAvatar.mutate.mockResolvedValue({ success: true });

      const result = await service.deleteAvatar();

      expect(result).toEqual({ success: true });
      expect(service.getUser()).toEqual({ ...mockUser, avatar_url: null });
    });
  });

  describe('email/password flows', () => {
    it('cancelEmailChange refreshes the current user after the mutation', async () => {
      mockApi.auth.cancelEmailChange.mutate.mockResolvedValue({ success: true });
      mockApi.auth.currentUser.query.mockResolvedValue(mockUser);

      const result = await service.cancelEmailChange();

      expect(result).toEqual({ success: true });
      expect(mockApi.auth.currentUser.query).toHaveBeenCalled();
    });

    it('resetPassword forwards the code and password, opting out of the global error handler', async () => {
      mockApi.auth.resetPassword.mutate.mockResolvedValue({ success: true });

      await service.resetPassword({ code: 'abc', password: 'newpw' });

      expect(mockApi.auth.resetPassword.mutate).toHaveBeenCalledWith(
        { code: 'abc', password: 'newpw' },
        { context: { skipErrorHandler: true } },
      );
    });

    it('sendPasswordResetEmail forwards the email, opting out of the global error handler', async () => {
      mockApi.auth.sendPasswordResetEmail.mutate.mockResolvedValue({ success: true });

      await service.sendPasswordResetEmail({ email: 'a@b.com' });

      expect(mockApi.auth.sendPasswordResetEmail.mutate).toHaveBeenCalledWith(
        { email: 'a@b.com' },
        { context: { skipErrorHandler: true } },
      );
    });

    it('verifyEmail forwards the code', async () => {
      mockApi.auth.verifyEmail.mutate.mockResolvedValue({ success: true });

      const result = await service.verifyEmail({ code: '123' });

      expect(mockApi.auth.verifyEmail.mutate).toHaveBeenCalledWith({ code: '123' });
      expect(result).toEqual({ success: true });
    });

    it('resendVerificationEmail forwards the email, opting out of the global error handler', async () => {
      mockApi.auth.resendVerificationEmail.mutate.mockResolvedValue({ success: true });

      await service.resendVerificationEmail('a@b.com');

      expect(mockApi.auth.resendVerificationEmail.mutate).toHaveBeenCalledWith(
        { email: 'a@b.com' },
        { context: { skipErrorHandler: true } },
      );
    });

    it('checkEmail queries passkey availability for the given email, opting out of the global error handler', async () => {
      mockApi.auth.checkEmail.query.mockResolvedValue({ hasPasskeys: true });

      const result = await service.checkEmail('a@b.com');

      expect(mockApi.auth.checkEmail.query).toHaveBeenCalledWith(
        { email: 'a@b.com' },
        { context: { skipErrorHandler: true } },
      );
      expect(result).toEqual({ hasPasskeys: true });
    });
  });

  describe('passkeys', () => {
    it('signInWithPasskey resolves the user on success', async () => {
      mockApi.auth.passkeyAuthenticationOptions.query.mockResolvedValue({ options: {}, nonce: 'nonce-1' });
      vi.mocked(startAuthentication).mockResolvedValue({ id: 'cred-1' } as any);
      mockApi.auth.verifyPasskeyAuthentication.mutate.mockResolvedValue({ auth_token: 'a1', refresh_token: 'r1' });
      mockApi.auth.currentUser.query.mockResolvedValue(mockUser);

      const result = await service.signInWithPasskey(true);

      expect(result).toEqual({ user: mockUser, cancelled: false });
    });

    it('signInWithPasskey reports cancellation when the browser prompt is dismissed', async () => {
      mockApi.auth.passkeyAuthenticationOptions.query.mockResolvedValue({ options: {}, nonce: 'nonce-1' });
      const notAllowed = new DOMException('cancelled', 'NotAllowedError');
      vi.mocked(startAuthentication).mockRejectedValue(notAllowed);

      const result = await service.signInWithPasskey();

      expect(result).toEqual({ user: null, cancelled: true });
      expect(mockApi.auth.verifyPasskeyAuthentication.mutate).not.toHaveBeenCalled();
    });

    it('signInWithPasskey rethrows unexpected errors from the browser prompt', async () => {
      mockApi.auth.passkeyAuthenticationOptions.query.mockResolvedValue({ options: {}, nonce: 'nonce-1' });
      const unexpected = new Error('boom');
      vi.mocked(startAuthentication).mockRejectedValue(unexpected);

      await expect(service.signInWithPasskey()).rejects.toBe(unexpected);
    });

    it('registerPasskey completes the registration ceremony', async () => {
      mockApi.auth.passkeyRegistrationOptions.query.mockResolvedValue({ challenge: 'c1' });
      vi.mocked(startRegistration).mockResolvedValue({ id: 'cred-1' } as any);
      mockApi.auth.verifyPasskeyRegistration.mutate.mockResolvedValue({ verified: true });

      const result = await service.registerPasskey('My phone');

      expect(mockApi.auth.verifyPasskeyRegistration.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ friendlyName: 'My phone' }),
      );
      expect(result).toEqual({ verified: true });
    });

    it('listPasskeys / deletePasskey / dismissPasskeyPrompt / updatePasskeyName delegate to the api', async () => {
      mockApi.auth.listPasskeys.query.mockResolvedValue([]);
      mockApi.auth.deletePasskey.mutate.mockResolvedValue({ success: true });
      mockApi.auth.dismissPasskeyPrompt.mutate.mockResolvedValue({ success: true });
      mockApi.auth.updatePasskeyName.mutate.mockResolvedValue({ success: true });

      await service.listPasskeys();
      await service.deletePasskey('cred-1');
      await service.dismissPasskeyPrompt();
      await service.updatePasskeyName('cred-1', 'New name');

      expect(mockApi.auth.listPasskeys.query).toHaveBeenCalled();
      expect(mockApi.auth.deletePasskey.mutate).toHaveBeenCalledWith({ id: 'cred-1' });
      expect(mockApi.auth.dismissPasskeyPrompt.mutate).toHaveBeenCalled();
      expect(mockApi.auth.updatePasskeyName.mutate).toHaveBeenCalledWith({ id: 'cred-1', friendlyName: 'New name' });
    });
  });
});
