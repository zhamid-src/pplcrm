import { vi } from 'vitest';

import type { ServerEmail } from '../../../../../../../../libs/common/src/lib/emails';
import { EmailActionsStore } from './email-actions.store';
import { EmailStateStore } from './email-state.store';

/**
 * Regression: assigning an email must NOT yank the user's selection away.
 *
 * The bug: assigning used `refreshFolder: true`, which reloaded the current
 * folder right after the assign. In a filtered virtual folder (e.g. "Mine" or
 * "Unassigned"), the just-assigned email no longer matches the filter, so it
 * dropped out of the reloaded list. email-list's auto-select effect then saw the
 * selected email vanish and either cleared the selection or jumped to the next
 * (unassigned → "Noone") email. The user's assignment persisted on the server but
 * the UI appeared to "revert to Noone". See email-list.ts auto-select effect.
 *
 * The fix: assigning only patches the row optimistically and refreshes counts —
 * it does NOT force a folder reload. Folder membership reconciles on next visit.
 */
describe('EmailActionsStore.assignEmailToUser', () => {
  const FOLDER = 'mine'; // a filtered virtual folder (assigned-to-me)
  const EMAIL_ID = '23';

  function seededState(): EmailStateStore {
    const state = new EmailStateStore();
    const serverEmail: ServerEmail = {
      id: EMAIL_ID,
      folder_id: FOLDER,
      subject: 'Meet-and-greet',
      is_favourite: false,
      assigned_to: '13', // currently owned by the signed-in user
      updated_at: '2026-07-16T00:00:00.000Z',
    };
    state.setEmailsForFolder(FOLDER, [serverEmail], false);
    state.activeFolderId.set(FOLDER);
    state.selectEmail({ id: EMAIL_ID });
    return state;
  }

  function makeStore(state: EmailStateStore) {
    const folders = {
      currentSelectedFolderId: vi.fn(() => FOLDER),
      loadEmailsForFolder: vi.fn().mockResolvedValue(undefined),
      refreshFolderCounts: vi.fn().mockResolvedValue(undefined),
    };
    const svc = { assign: vi.fn().mockResolvedValue(undefined) };
    const alerts = { showError: vi.fn(), showSuccess: vi.fn() };

    const store = Object.create(EmailActionsStore.prototype) as EmailActionsStore;
    (store as unknown as { state: EmailStateStore }).state = state;
    (store as unknown as { folders: typeof folders }).folders = folders;
    (store as unknown as { svc: typeof svc }).svc = svc;
    (store as unknown as { alerts: typeof alerts }).alerts = alerts;
    return { store, folders, svc };
  }

  it('persists the assignment and reflects the new owner optimistically', async () => {
    const state = seededState();
    const { store, svc } = makeStore(state);

    await store.assignEmailToUser(EMAIL_ID, '14', 'Natalie');

    expect(svc.assign).toHaveBeenCalledWith(EMAIL_ID, '14', 'Natalie');
    expect(state.readEmail(EMAIL_ID)?.assigned_to).toBe('14');
  });

  it('does NOT reload the folder (so the selected email is not yanked away)', async () => {
    const state = seededState();
    const { store, folders } = makeStore(state);

    await store.assignEmailToUser(EMAIL_ID, '14', 'Natalie');

    // The regression guard: no folder reload on assign.
    expect(folders.loadEmailsForFolder).not.toHaveBeenCalled();
    // The email you were looking at is still selected and still present.
    expect(state.currentSelectedEmailId()).toBe(EMAIL_ID);
    expect(state.readEmail(EMAIL_ID)).toBeDefined();
    // Counts still refresh so the sidebar ("Mine 1" → "Mine 0") stays honest.
    expect(folders.refreshFolderCounts).toHaveBeenCalled();
  });

  it('unassigning clears the owner without reloading the folder', async () => {
    const state = seededState();
    const { store, svc, folders } = makeStore(state);

    await store.assignEmailToUser(EMAIL_ID, null, null);

    expect(svc.assign).toHaveBeenCalledWith(EMAIL_ID, null, null);
    expect(state.readEmail(EMAIL_ID)?.assigned_to).toBeUndefined();
    expect(folders.loadEmailsForFolder).not.toHaveBeenCalled();
    expect(state.currentSelectedEmailId()).toBe(EMAIL_ID);
  });

  it('rolls the row back and rethrows if the server assign fails', async () => {
    const state = seededState();
    const { store, svc } = makeStore(state);
    svc.assign.mockRejectedValueOnce(new Error('boom'));

    await expect(store.assignEmailToUser(EMAIL_ID, '14', 'Natalie')).rejects.toThrow('boom');

    // Optimistic patch is reverted to the previous owner.
    expect(state.readEmail(EMAIL_ID)?.assigned_to).toBe('13');
  });
});
