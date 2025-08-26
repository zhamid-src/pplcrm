/**
 * Unit tests for `EmailsRouter` verifying email deletion procedures
 * delegate to the controller and return expected results.
 */
import { EmailsController } from './controller';
import { EmailsRouter } from './trpc.router';

/** Test suite for email-related router procedures. */
describe('EmailsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof EmailsRouter.createCaller>;

  /** Mock controller methods and create router caller. */
  beforeAll(() => {
    jest.spyOn(EmailsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(EmailsController.prototype, 'deleteMany').mockResolvedValue(true as any);
    caller = EmailsRouter.createCaller(ctx);
  });

  /** Restore mocked methods after tests. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /** Tests deleting a single email. */
  it('deletes an email', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  /** Tests deleting multiple emails. */
  it('deletes multiple emails', async () => {
    await expect(caller.deleteMany(['1', '2'])).resolves.toBeTruthy();
  });
});
