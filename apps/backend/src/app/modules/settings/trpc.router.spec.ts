/**
 * Unit tests for `SettingsRouter` verifying retrieval of settings
 * such as the current campaign identifier.
 */
import { SettingsController } from './controller';
import { SettingsRouter } from './trpc.router';

describe('SettingsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the current campaign id as provided by the controller', async () => {
    const spy = jest
      .spyOn(SettingsController.prototype, 'getCurrentCampaignId')
      .mockResolvedValue('42');
    const caller = SettingsRouter.createCaller(ctx);

    await expect(caller.getCurrentCampaignId()).resolves.toBe('42');
    expect(spy).toHaveBeenCalledWith(ctx.auth);
  });

  it('returns the tenant settings snapshot', async () => {
    const snapshot = { foo: 'bar' } as Record<string, unknown>;
    const spy = jest.spyOn(SettingsController.prototype, 'getSnapshot').mockResolvedValue(snapshot);
    const caller = SettingsRouter.createCaller(ctx);

    await expect(caller.getSnapshot()).resolves.toBe(snapshot);
    expect(spy).toHaveBeenCalledWith(ctx.auth);
  });

  it('upserts settings entries and returns the refreshed snapshot', async () => {
    const payload = { entries: [{ key: 'notifications.email', value: true }] };
    const snapshot = { 'notifications.email': true } as Record<string, unknown>;
    const spy = jest.spyOn(SettingsController.prototype, 'upsert').mockResolvedValue(snapshot);
    const caller = SettingsRouter.createCaller(ctx);

    await expect(caller.upsert(payload)).resolves.toBe(snapshot);
    expect(spy).toHaveBeenCalledWith(ctx.auth, payload.entries);
  });
});
