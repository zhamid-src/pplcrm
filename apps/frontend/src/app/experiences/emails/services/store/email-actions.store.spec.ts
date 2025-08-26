import { TestBed } from '@angular/core/testing';

import { EmailsService } from '../emails-service';
import { EmailActionsStore } from './email-actions.store';
import { EmailCacheStore } from './email-cache.store';
import { EmailFoldersStore } from './email-folders.store';
import { EmailStateStore } from './email-state.store';
import { ALL_FOLDERS } from 'common/src/lib/emails';

describe('EmailActionsStore deleteDraft', () => {
  let store: EmailActionsStore;
  let svc: { deleteDraft: jest.Mock };
  let folders: {
    currentSelectedFolderId: jest.Mock;
    loadEmailsForFolder: jest.Mock;
    refreshFolderCounts: jest.Mock;
  };

  beforeEach(() => {
    svc = { deleteDraft: jest.fn().mockResolvedValue(undefined) };
    folders = {
      currentSelectedFolderId: jest.fn().mockReturnValue(ALL_FOLDERS.DRAFTS),
      loadEmailsForFolder: jest.fn().mockResolvedValue(undefined),
      refreshFolderCounts: jest.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        EmailActionsStore,
        { provide: EmailsService, useValue: svc },
        { provide: EmailFoldersStore, useValue: folders },
        { provide: EmailCacheStore, useValue: {} },
        { provide: EmailStateStore, useValue: {} },
      ],
    });
    store = TestBed.inject(EmailActionsStore);
  });

  it('refreshes counts and reloads drafts after deleting a draft', async () => {
    await store.deleteDraft('42');
    expect(svc.deleteDraft).toHaveBeenCalledWith('42');
    expect(folders.refreshFolderCounts).toHaveBeenCalled();
    expect(folders.loadEmailsForFolder).toHaveBeenCalledWith(ALL_FOLDERS.DRAFTS);
  });
});
