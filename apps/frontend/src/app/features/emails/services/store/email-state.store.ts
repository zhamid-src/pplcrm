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

  /** NEW: map of emailId -> hasAttachment (true/false). undefined = unknown/not loaded yet */
  public readonly hasAttachmentByEmailId = signal<Record<string, boolean | undefined>>({});

  /** Global UI flag: whether the email body view is expanded to fill the window */
  public readonly isBodyExpanded = signal<boolean>(false);

  /** Clear flag for an email (e.g., after delete) */
  public clearHasAttachment(emailId: string) {
    this.hasAttachmentByEmailId.update((m) => {
      const next = { ...m };
      delete next[emailId];
      return next;
    });
  }

  /** Computed: emails in a given folder (helper for orchestrator/UI) */
  public emailsInFolder(folderId: string) {
    return computed(() => {
      const ids = this.emailIdsByFolderId()[folderId] ?? [];
      const map = this.emailsById();
      return ids.map((id) => map[id]).filter(Boolean);
    });
  }

  /** OPTIONAL: view helper that decorates emails with hasAttachment flag */
  public emailsInFolderWithFlags(folderId: string) {
    return computed(() => {
      const ids = this.emailIdsByFolderId()[folderId] ?? [];
      const emailsMap = this.emailsById();
      const flags = this.hasAttachmentByEmailId();
      return ids
        .map((id) => emailsMap[id])
        .filter(Boolean)
        .map((e) => ({ ...e!, has_attachment: flags[e!.id] ?? false }));
    });
  }

  /** Computed (helper): hasAttachment for a specific emailId */
  public hasAttachment(emailId: string) {
    return computed<boolean | undefined>(() => this.hasAttachmentByEmailId()[emailId]);
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
   * (Does not change hasAttachment flags — let orchestrator fill them.)
   */
  public setEmailsForFolder(folderId: string, serverEmails: any[]): void {
    const flags = serverEmails.map((s) => ({
      id: String(s.id),
      has: s.has_attachment !== undefined ? !!s.has_attachment : (s.attachment_count ?? 0) > 0,
    }));

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
          att_count: s.att_count ?? 0,
          has_attachment: !!s.has_attachment || (s.attachment_count ?? 0) > 0,
        };
        next[e.id] = e;
      }
      return next;
    });

    this.emailIdsByFolderId.update((byFolder) => ({
      ...byFolder,
      [String(folderId)]: serverEmails.map((e) => String(e.id)),
    }));

    this.setManyHasAttachment(flags);
  }

  /** ---------- NEW: mutators for hasAttachment flags ---------- */

  /** Set/overwrite a single email's hasAttachment flag */
  public setHasAttachment(emailId: string, hasAttachment: boolean | undefined) {
    this.hasAttachmentByEmailId.update((m) => ({ ...m, [emailId]: hasAttachment }));
  }

  /** Bulk set flags (e.g., from counts API or per-email checks) */
  public setManyHasAttachment(entries: Array<{ id: string; has: boolean | undefined }>) {
    if (!entries.length) return;
    this.hasAttachmentByEmailId.update((m) => {
      const next = { ...m };
      for (const { id, has } of entries) next[id] = has;
      return next;
    });
  }

  /** Toggle the body expanded view */
  public toggleBodyExpanded(): void {
    this.isBodyExpanded.update((v) => !v);
  }
}

export type EmailId = string | number;
