/**
 * Unit tests for `SettingsRouter` verifying retrieval of settings
 * such as the current campaign identifier.
 */
import { TRPCError } from '@trpc/server';
import { SettingsController } from './controller';
import { SettingsRouter } from './trpc.router';

/** Test suite for settings-related router procedures. */
describe('SettingsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof SettingsRouter.createCaller>;

  /** Mock controller methods and create router caller. */
  beforeAll(() => {
    jest.spyOn(SettingsController.prototype, 'getCurrentCampaignId').mockResolvedValue(1 as any);
    caller = SettingsRouter.createCaller(ctx);
  });

  /** Restore mocked methods after tests. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /**
   * Ensures an error is thrown when the stored campaign ID is not a valid number.
   */
  it('throws when current campaign id is not "number" string', async () => {
    await expect(caller.getCurrentCampaignId()).rejects.toBeInstanceOf(TRPCError);
  });
});
