import { describe, it, expect } from 'vitest';
import { folderIdSchema, regularFolderIdSchema } from './emails.schema';
import { ALL_FOLDER_IDS, EMAIL_FOLDERS } from '../emails';

// With the email_folders table dropped, these schemas are the application-side
// guard (alongside the chk_emails_folder_id CHECK constraint) that keeps
// garbage folder ids out of emails.folder_id.
describe('folder id schemas', () => {
  const realIds = EMAIL_FOLDERS.filter((f) => !f.is_virtual).map((f) => f.id);
  const virtualIds = EMAIL_FOLDERS.filter((f) => f.is_virtual).map((f) => f.id);

  it('regularFolderIdSchema accepts every real (storable) folder id', () => {
    for (const id of realIds) {
      expect(regularFolderIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('regularFolderIdSchema rejects virtual folder ids — they are query filters, never storage', () => {
    for (const id of virtualIds) {
      expect(regularFolderIdSchema.safeParse(id).success).toBe(false);
    }
  });

  it('regularFolderIdSchema rejects unknown ids and non-strings', () => {
    expect(regularFolderIdSchema.safeParse('999').success).toBe(false);
    expect(regularFolderIdSchema.safeParse('').success).toBe(false);
    expect(regularFolderIdSchema.safeParse(10).success).toBe(false);
  });

  it('folderIdSchema accepts every folder id, real and virtual', () => {
    for (const id of ALL_FOLDER_IDS) {
      expect(folderIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('folderIdSchema rejects unknown ids', () => {
    expect(folderIdSchema.safeParse('999').success).toBe(false);
  });
});
