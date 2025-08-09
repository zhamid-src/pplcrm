import { EmailClient } from './email-client';
import { EmailsService } from '../services/emails-service';

jest.mock('../services/emails-service', () => ({
  EmailsService: class {
    getFolders() {
      return Promise.resolve([{ id: '1', name: 'Inbox' }]);
    }
    getEmails() {
      return Promise.resolve([]);
    }
    getEmail() {
      return Promise.resolve({ email: { id: '1', subject: 'a', body: 'b' }, comments: [] });
    }
    addComment() {
      return Promise.resolve(null);
    }
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
