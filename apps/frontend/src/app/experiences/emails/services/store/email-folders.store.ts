/**
 * @file Folder list + counts + selection, plus loading emails for a folder.
 * Injects EmailStateStore to write normalized emails when a folder is selected.
 */
import { Injectable, computed, inject, signal } from '@angular/core';

import { EmailsService } from '../emails-service';
import { EmailStateStore } from './email-state.store';
import { ServerEmail } from 'common/src/lib/emails';
import type { EmailFolderType } from 'common/src/lib/models';

@Injectable({ providedIn: 'root' })
export class EmailFoldersStore {
  /** Available email folders */
  private readonly emailFolders = signal<EmailFolderType[]>([]);
  private readonly loading = signal(true);
  private readonly state = inject(EmailStateStore);
  private readonly svc = inject(EmailsService);

  /** Folders list for UI */
  public readonly allFolders = computed(() => this.emailFolders());

  /** Currently selected folder ID */
  public readonly currentSelectedFolderId = signal<string | null>(null);
  public readonly isLoading = this.loading.asReadonly();

  public async loadAllFolders(): Promise<EmailFolderType[]> {
    const folders = (await this.svc.getFolders()) as EmailFolderType[];
    this.emailFolders.set(folders);
    return folders;
  }

  public async loadAllFoldersWithCounts(): Promise<(EmailFolderType & { email_count: number })[]> {
    const folders = (await this.svc.getFoldersWithCounts()) as (EmailFolderType & { email_count: number })[];
    this.emailFolders.set(folders);

    // Auto-select default folder if none chosen yet
    if (!this.currentSelectedFolderId() && folders.length > 0) {
      const def = folders.find((f) => f.is_default);
      if (def) this.selectFolder(def);
    }
    return folders;
  }

  public async loadEmailsForFolder(folderId: string): Promise<void> {
    this.loading.set(true);
    try {
      const raw = await this.svc.getEmails(folderId); // raw DB-ish rows

      const emailsFromServer: ServerEmail[] = raw.map(normalizeServerEmailRow);

      this.state.setEmailsForFolder(folderId, emailsFromServer);
    } finally {
      this.loading.set(false);
    }
  }

  /** Refresh counts (after a mutation) */
  public async refreshFolderCounts(): Promise<void> {
    await this.loadAllFoldersWithCounts();
  }

  /**
   * Select a folder and load its emails into EmailStateStore.
   * Clears selected email to keep UI consistent.
   */
  public selectFolder(folder: EmailFolderType | null): void {
    const id = folder ? String(folder.id) : null;
    this.currentSelectedFolderId.set(id);
    if (id) void this.loadEmailsForFolder(id);
    this.state.selectEmail(null);
  }
}

type SqlBool = boolean | 0 | 1 | '0' | '1' | 't' | 'f' | 'true' | 'false' | null | undefined;

function normalizeServerEmailRow(r: any): ServerEmail {
  // prefer explicit flag; otherwise derive from count
  const hasFlag = toBool(r.has_attachment);
  const countNum = toNum(r.attachment_count ?? r.att_count);

  return {
    id: String(r.id),
    folder_id: String(r.folder_id),
    updated_at: r.updated_at, // OK if string or Date per your type
    is_favourite: !!r.is_favourite,
    status: r.status ?? undefined,
    from_email: r.from_email ?? null,
    to_email: r.to_email ?? null,
    subject: r.subject ?? null,
    preview: r.preview ?? null,
    assigned_to: r.assigned_to ?? null,

    has_attachment: hasFlag ?? (countNum !== undefined ? countNum > 0 : undefined),
    attachment_count: typeof r.attachment_count === 'boolean' ? undefined : countNum,
  };
}

function toBool(v: SqlBool): boolean | undefined {
  if (v === true || v === 1 || v === '1' || v === 't' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'f' || v === 'false') return false;
  return undefined;
}

function toNum(n: unknown): number | undefined {
  if (n == null) return undefined;
  if (typeof n === 'bigint') return Number(n);
  if (typeof n === 'string') return Number(n) || 0;
  if (typeof n === 'number') return n;
  return undefined;
}
