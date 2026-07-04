import { TokenService } from './token-service';

describe('TokenService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('defaults to session storage when no persistence flag is set', () => {
    const service = new TokenService();

    service.setAuthToken('session-token');

    expect(sessionStorage.getItem('ppl-crm-auth-token')).toBe('session-token');
    expect(localStorage.getItem('ppl-crm-auth-token')).toBeNull();
    expect(service.getPersistence()).toBe(false);
  });

  it('uses local storage once persistence has been enabled', () => {
    const service = new TokenService();

    service.setPersistence(true);
    service.setAuthToken('persisted-token');

    expect(localStorage.getItem('ppl-crm-auth-token')).toBe('persisted-token');
    expect(sessionStorage.getItem('ppl-crm-auth-token')).toBeNull();
    expect(service.getAuthToken()).toBe('persisted-token');
  });

  it('picks up an existing persistence flag from localStorage on construction', () => {
    localStorage.setItem('pc-persistence', '1');

    const service = new TokenService();

    expect(service.getPersistence()).toBe(true);
  });

  it('set() stores both tokens and removes them when falsy', () => {
    const service = new TokenService();

    service.set({ auth_token: 'a1', refresh_token: 'r1' });
    expect(service.getAuthToken()).toBe('a1');
    expect(service.getRefreshToken()).toBe('r1');

    service.set({ auth_token: '', refresh_token: '' });
    expect(service.getAuthToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });

  it('get() returns both tokens together', () => {
    const service = new TokenService();
    service.set({ auth_token: 'a1', refresh_token: 'r1' });

    expect(service.get()).toEqual({ auth_token: 'a1', refresh_token: 'r1' });
  });

  it('clearAll() removes tokens from both storages regardless of persistence mode', () => {
    const service = new TokenService();
    service.setPersistence(true);
    service.setAuthToken('persisted-token');
    service.setRefreshToken('persisted-refresh');

    service.clearAll();

    expect(localStorage.getItem('ppl-crm-auth-token')).toBeNull();
    expect(localStorage.getItem('ppl-crm-refresh-token')).toBeNull();
  });

  it('switching persistence off clears persistent storage', () => {
    const service = new TokenService();
    service.setPersistence(true);
    service.setAuthToken('persisted-token');

    service.setPersistence(false);

    expect(localStorage.getItem('ppl-crm-auth-token')).toBeNull();
    expect(localStorage.getItem('pc-persistence')).toBe('0');
  });

  it('switching persistence on clears any session storage tokens', () => {
    const service = new TokenService();
    service.setAuthToken('session-token');

    service.setPersistence(true);

    expect(sessionStorage.getItem('ppl-crm-auth-token')).toBeNull();
    expect(localStorage.getItem('pc-persistence')).toBe('1');
  });

  it('removeAuthToken / removeRefreshToken clear only the targeted token', () => {
    const service = new TokenService();
    service.set({ auth_token: 'a1', refresh_token: 'r1' });

    service.removeAuthToken();
    expect(service.getAuthToken()).toBeNull();
    expect(service.getRefreshToken()).toBe('r1');

    service.removeRefreshToken();
    expect(service.getRefreshToken()).toBeNull();
  });
});
