/**
 * @file Unit tests for the {@link EmailClient} component.
 */
import { EmailClient } from './email-client';
import { EmailsService } from '../services/emails-service';

jest.mock('../services/emails-service', () => ({
  /** Simple mock implementation of EmailsService for tests */
  EmailsService: class {
    /** Mock returning a single folder */
    getFolders() {
      return Promise.resolve([{ id: '1', name: 'Inbox' }]);
    }
    /** Mock returning an empty email list */
    getEmails() {
      return Promise.resolve([]);
    }
    /** Mock returning a single email with empty comments */
    getEmail() {
      return Promise.resolve({ email: { id: '1', subject: 'a', body: 'b' }, comments: [] });
    }
    /** Mock for adding a comment */
    addComment() {
      return Promise.resolve(null);
    }
    /** Mock for assigning an email */
    assign() {
      return Promise.resolve(null);
    }
  },
}));

describe('EmailClient', () => {
  it('loads folders on init', async () => {
    const svc = new EmailsService();
    const comp = new EmailClient(svc as any);
    await comp.ngOnInit();
    expect(comp.folders.length).toBe(1);
  });
});
