import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { ServerEmail } from '../../../../../../../../libs/common/src/lib/emails';
import { EmailsService } from '../emails-service';
import { EmailFoldersStore } from './email-folders.store';
import { EmailStateStore } from './email-state.store';

/** Mirrors the page-size constants in email-folders.store.ts. */
const INITIAL_PAGE_SIZE = 50;
const NEXT_PAGE_SIZE = 25;

const FOLDER = 'inbox';

/** `count` server rows with ids startAt+1 … startAt+count (as the backend would page them). */
function rows(count: number, startAt = 0, folderId = FOLDER): ServerEmail[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(startAt + i + 1),
    folder_id: folderId,
    subject: `Email ${startAt + i + 1}`,
    is_favourite: false,
    updated_at: '2026-07-01T00:00:00.000Z',
  }));
}

describe('EmailFoldersStore paging', () => {
  let getEmails: ReturnType<typeof vi.fn>;
  let store: EmailFoldersStore;
  let state: EmailStateStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    getEmails = vi.fn();
    TestBed.configureTestingModule({
      providers: [EmailFoldersStore, EmailStateStore, { provide: EmailsService, useValue: { getEmails } }],
    });
    store = TestBed.inject(EmailFoldersStore);
    state = TestBed.inject(EmailStateStore);
    store.currentSelectedFolderId.set(FOLDER);
    state.activeFolderId.set(FOLDER);
  });

  it('loads the first page and keeps hasMore on when the page is full', async () => {
    getEmails.mockResolvedValueOnce(rows(INITIAL_PAGE_SIZE));

    await store.loadEmailsForFolder(FOLDER);

    expect(getEmails).toHaveBeenCalledWith(FOLDER, INITIAL_PAGE_SIZE, 0);
    expect(state.emailIdsByFolderId()[FOLDER]).toHaveLength(INITIAL_PAGE_SIZE);
    expect(store.hasMore()).toBe(true);
  });

  it('turns hasMore off on a short first page and never fetches again', async () => {
    getEmails.mockResolvedValueOnce(rows(3));

    await store.loadEmailsForFolder(FOLDER);
    expect(store.hasMore()).toBe(false);

    await store.loadNextPage();
    expect(getEmails).toHaveBeenCalledTimes(1); // quiet end-of-list: no extra call
  });

  it('appends the next page at the current offset without losing order or selection', async () => {
    getEmails.mockResolvedValueOnce(rows(INITIAL_PAGE_SIZE));
    await store.loadEmailsForFolder(FOLDER);
    state.selectEmail({ id: '7' });

    getEmails.mockResolvedValueOnce(rows(NEXT_PAGE_SIZE, INITIAL_PAGE_SIZE));
    await store.loadNextPage();

    expect(getEmails).toHaveBeenLastCalledWith(FOLDER, NEXT_PAGE_SIZE, INITIAL_PAGE_SIZE);
    const ids = state.emailIdsByFolderId()[FOLDER] ?? [];
    expect(ids).toHaveLength(INITIAL_PAGE_SIZE + NEXT_PAGE_SIZE);
    expect(ids[0]).toBe('1'); // existing rows untouched…
    expect(ids[INITIAL_PAGE_SIZE]).toBe(String(INITIAL_PAGE_SIZE + 1)); // …new rows appended after them
    expect(state.currentSelectedEmailId()).toBe('7'); // selection survives the append
    expect(store.hasMore()).toBe(true);
  });

  it('turns hasMore off when the next page comes back short', async () => {
    getEmails.mockResolvedValueOnce(rows(INITIAL_PAGE_SIZE));
    await store.loadEmailsForFolder(FOLDER);

    getEmails.mockResolvedValueOnce(rows(4, INITIAL_PAGE_SIZE));
    await store.loadNextPage();

    expect(store.hasMore()).toBe(false);
    await store.loadNextPage();
    expect(getEmails).toHaveBeenCalledTimes(2);
  });

  it('does not append a row that is already loaded (offset drift stays visible-duplicate-free)', async () => {
    getEmails.mockResolvedValueOnce(rows(INITIAL_PAGE_SIZE));
    await store.loadEmailsForFolder(FOLDER);

    // A new email arriving on the server shifts offsets, so the next page can
    // re-contain the last already-loaded row. It must not show twice.
    getEmails.mockResolvedValueOnce(rows(NEXT_PAGE_SIZE, INITIAL_PAGE_SIZE - 1));
    await store.loadNextPage();

    const ids = state.emailIdsByFolderId()[FOLDER] ?? [];
    expect(ids).toHaveLength(INITIAL_PAGE_SIZE + NEXT_PAGE_SIZE - 1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores a second loadNextPage while one is already in flight', async () => {
    getEmails.mockResolvedValueOnce(rows(INITIAL_PAGE_SIZE));
    await store.loadEmailsForFolder(FOLDER);

    let resolveFetch: (value: ServerEmail[]) => void = () => undefined;
    getEmails.mockReturnValueOnce(
      new Promise<ServerEmail[]>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = store.loadNextPage();
    const second = store.loadNextPage(); // rapid scroll event — must be a no-op
    resolveFetch(rows(NEXT_PAGE_SIZE, INITIAL_PAGE_SIZE));
    await Promise.all([first, second]);

    expect(getEmails).toHaveBeenCalledTimes(2); // 1 initial + 1 next page
  });

  it('drops a late next-page result if the user switched folders meanwhile', async () => {
    getEmails.mockResolvedValueOnce(rows(INITIAL_PAGE_SIZE));
    await store.loadEmailsForFolder(FOLDER);

    let resolveFetch: (value: ServerEmail[]) => void = () => undefined;
    getEmails.mockReturnValueOnce(
      new Promise<ServerEmail[]>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const pending = store.loadNextPage();
    store.currentSelectedFolderId.set('sent'); // user navigates away mid-fetch
    resolveFetch(rows(NEXT_PAGE_SIZE, INITIAL_PAGE_SIZE));
    await pending;

    expect(state.emailIdsByFolderId()[FOLDER]).toHaveLength(INITIAL_PAGE_SIZE); // stale page not landed
  });
});
