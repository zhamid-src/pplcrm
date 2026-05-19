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
