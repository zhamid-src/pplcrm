/**
 * @file Core email entity state (normalized map, per-folder ids, and selection).
 * Small, focused store: no I/O, no cache, no folders. Pure state & transforms.
 */
import { Injectable, computed, signal } from '@angular/core';

import type { EmailType } from 'common/src/lib/models';

@Injectable({ providedIn: 'root' })
export class EmailStateStore {
  /** Currently selected email ID */
  public readonly currentSelectedEmailId = signal<string | null>(null);

  /** Normalized email data storage, keyed by email ID */
  public readonly emailsById = signal<Record<string, EmailType>>({});

  /** Currently selected email (or null) */
  public readonly currentSelectedEmail = computed(() => {
    const id = this.currentSelectedEmailId();
    return id ? (this.emailsById()[id] ?? null) : null;
  });

  /** Email IDs organized by folder ID for efficient lookup */
  public readonly emailIdsByFolderId = signal<Record<string, string[]>>({});

  /** Computed: emails in a given folder (helper for orchestrator/UI) */
  public emailsInFolder(folderId: string) {
    return computed(() => {
      const ids = this.emailIdsByFolderId()[folderId] ?? [];
      const map = this.emailsById();
      return ids.map((id) => map[id]).filter(Boolean);
    });
  }

  /** Patch one email and return the previous snapshot for rollback */
  public patchEmail(emailKey: string, patch: Partial<EmailType>): EmailType | undefined {
    const prev = this.readEmail(emailKey);
    if (!prev) return undefined;
    this.emailsById.update((m) => ({ ...m, [emailKey]: { ...prev, ...patch } }));
    return prev;
  }

  public readEmail(emailKey: string): EmailType | undefined {
    return this.emailsById()[emailKey];
  }

  public replaceEmail(emailKey: string, value: EmailType): void {
    this.emailsById.update((m) => ({ ...m, [emailKey]: value }));
  }

  /** Replace selection */
  public selectEmail(email: EmailType | { id: EmailId } | null): void {
    this.currentSelectedEmailId.set(email ? String(email.id) : null);
  }

  /**
   * Transform and set emails for a folder from server response.
   * Keeps normalized `emailsById` and the per-folder list in sync.
   */
  public setEmailsForFolder(folderId: string, serverEmails: any[]): void {
    this.emailsById.update((map) => {
      const next = { ...map };
      for (const s of serverEmails) {
        const e: EmailType = {
          id: String(s.id),
          folder_id: String(s.folder_id),
          updated_at: new Date(s.updated_at),
          is_favourite: s.is_favourite,
          status: (s as any).status || 'open',
          from_email: s.from_email ?? undefined,
          to_email: s.to_email ?? undefined,
          subject: s.subject ?? undefined,
          preview: s.preview ?? undefined,
          assigned_to: s.assigned_to ?? undefined,
        };
        next[e.id] = e;
      }
      return next;
    });

    this.emailIdsByFolderId.update((byFolder) => ({
      ...byFolder,
      [String(folderId)]: serverEmails.map((e) => String(e.id)),
    }));
  }
}

export type EmailId = string | number;
