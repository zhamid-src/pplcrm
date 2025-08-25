import { EmailsController } from './emails.controller';
import { EmailDraftsRepo } from '../repositories/emails/email-drafts.repo';

describe('EmailsController', () => {
  afterEach(() => jest.restoreAllMocks());

  it('saves a draft without recipients', async () => {
    const controller = new EmailsController();
    const spy = jest
      .spyOn(EmailDraftsRepo.prototype, 'saveDraft')
      .mockResolvedValue({ id: '1' } as any);

    await expect(
      controller.saveDraft('t1', 'u1', {
        to_list: [],
        cc_list: [],
        bcc_list: [],
      }),
    ).resolves.toEqual({ id: '1' });

    expect(spy).toHaveBeenCalledWith('t1', 'u1', {
      to_list: [],
      cc_list: [],
      bcc_list: [],
    });
  });
});
