import { of } from 'rxjs';
import { EmailClient } from './email-client';
import { EmailsService } from '../services/emails-service';

jest.mock('../services/emails-service', () => ({
  EmailsService: class {
    getFolders() {
      return of([{ id: '1', name: 'Inbox' }]);
    }
    getEmails() {
      return of([]);
    }
    getEmail() {
      return of({ email: { id: '1', subject: 'a', body: 'b' }, comments: [] });
    }
    addComment() {
      return of(null);
    }
    assign() {
      return of(null);
    }
  },
}));

describe('EmailClient', () => {
  it('loads folders on init', () => {
    const svc = new EmailsService();
    const comp = new EmailClient(svc as any);
    comp.ngOnInit();
    expect(comp.folders.length).toBe(1);
  });
});
