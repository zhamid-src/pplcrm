/**
 * @file Unit tests for the {@link EmailFolderList} component.
 */
import { EmailsService } from '../../services/emails-service';
import { EmailFolderList } from './email-folder-list';

jest.mock('../services/emails-service', () => ({
  /** Simple mock implementation of EmailsService for tests */
  EmailsService: class {
    /** Mock returning a single folder */
    getFolders() {
      return Promise.resolve([{ id: '1', name: 'Inbox' }]);
    }
  },
}));

describe('EmailFolderList', () => {
  it('loads folders on init', async () => {
    const svc = new EmailsService();
    const comp = new EmailFolderList(svc as any);
    await comp.ngOnInit();
    expect(comp.folders().length).toBe(1);
  });
});
