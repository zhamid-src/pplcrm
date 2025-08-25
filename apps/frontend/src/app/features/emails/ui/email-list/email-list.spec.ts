import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EmailList } from './email-list';
import { EmailsStore } from '../../services/store/emailstore';
import { ALL_FOLDERS } from 'common/src/lib/emails';
import type { EmailType } from 'common/src/lib/models';

describe('EmailList', () => {
  let component: EmailList;
  let mockStore: any;
  let emailsSignal = signal<EmailType[]>([]);
  let selectedIdSignal = signal<string | null>(null);
  let folderIdSignal = signal<string | null>(ALL_FOLDERS.DRAFTS);

  beforeEach(() => {
    emailsSignal = signal<EmailType[]>([]);
    selectedIdSignal = signal<string | null>(null);
    folderIdSignal = signal<string | null>(ALL_FOLDERS.DRAFTS);

    mockStore = {
      emailsInSelectedFolder: emailsSignal,
      currentSelectedEmailId: selectedIdSignal,
      currentSelectedFolderId: folderIdSignal,
      selectEmail: jest.fn(),
    } as Partial<EmailsStore>;

    TestBed.configureTestingModule({
      providers: [{ provide: EmailsStore, useValue: mockStore }],
    });

    component = TestBed.runInInjectionContext(() => new EmailList());
  });

  it('auto-selects the first email in drafts folder', () => {
    const draftEmail: EmailType = {
      id: '1',
      folder_id: ALL_FOLDERS.DRAFTS,
      updated_at: new Date(),
      is_favourite: false,
      attachment_count: 0,
      has_attachment: false,
      status: 'open',
    };

    let emitted: EmailType | undefined;
    component.emailSelected.subscribe((e) => (emitted = e));

    emailsSignal.set([draftEmail]);

    expect(emitted).toEqual(draftEmail);
  });
});
