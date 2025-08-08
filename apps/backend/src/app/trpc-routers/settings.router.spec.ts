import { TRPCError } from '@trpc/server';
import { SettingsController } from '../controllers/settings.controller';
import { SettingsRouter } from './settings.router';

describe('SettingsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof SettingsRouter.createCaller>;

  beforeAll(() => {
    jest.spyOn(SettingsController.prototype, 'getCurrentCampaignId').mockResolvedValue(1 as any);
    caller = SettingsRouter.createCaller(ctx);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('throws when current campaign id is not "number" string', async () => {
    await expect(caller.getCurrentCampaignId()).rejects.toBeInstanceOf(TRPCError);
  });
});
