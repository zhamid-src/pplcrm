import { computed, inject, signal, Service } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { EmailsService } from '../emails-service';
import { EmailStateStore } from './email-state.store';
import { ServerEmail } from '../../../../../../../../libs/common/src/lib/emails';
import type { EmailFolderType } from '../../../../../../../../libs/common/src/lib/models';

@Service()
export class EmailFoldersStore {
  private readonly emailFolders = signal<EmailFolderType[]>([]);
  private readonly state = inject(EmailStateStore);
  private readonly svc = inject(EmailsService);

  private _loading = createLoadingGate();

  public readonly allFolders = computed(() => this.emailFolders());

  public readonly currentSelectedFolderId = signal<string | null>(null);

  public isLoading = this._loading.visible;

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

  public hasMore = signal<boolean>(true);
  public isLoadingMore = signal<boolean>(false);

  public async loadEmailsForFolder(folderId: string): Promise<void> {
    const end = this._loading.begin();
    if (folderId === this.currentSelectedFolderId()) {
      this.hasMore.set(true);
    }
    try {
      const raw = await this.svc.getEmails(folderId, 40, 0); // initial load is 40

      const emailsFromServer: ServerEmail[] = raw.map(normalizeServerEmailRow);

      this.state.setEmailsForFolder(folderId, emailsFromServer, false);
      if (folderId === this.currentSelectedFolderId()) {
        if (emailsFromServer.length < 40) {
          this.hasMore.set(false);
        } else {
          this.hasMore.set(true);
        }
      }
    } finally {
      end();
    }
  }

  public async loadNextPage(): Promise<void> {
    const folderId = this.currentSelectedFolderId();
    if (!folderId || this.isLoadingMore() || !this.hasMore()) return;

    this.isLoadingMore.set(true);
    try {
      const currentIds = this.state.emailIdsByFolderId()[folderId] ?? [];
      const offset = currentIds.length;
      const raw = await this.svc.getEmails(folderId, 20, offset); // load 20 more
      const emailsFromServer: ServerEmail[] = raw.map(normalizeServerEmailRow);

      if (folderId === this.currentSelectedFolderId()) {
        this.state.setEmailsForFolder(folderId, emailsFromServer, true);
        if (emailsFromServer.length < 20) {
          this.hasMore.set(false);
        }
      }
    } catch (e) {
      console.error('Failed to load next page of emails', e);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  public async refreshFolderCounts(): Promise<void> {
    await this.loadAllFoldersWithCounts();
  }

  public selectFolder(folder: EmailFolderType | null): void {
    const id = folder ? String(folder.id) : null;
    this.currentSelectedFolderId.set(id);
    this.state.activeFolderId.set(id);
    if (id) void this.loadEmailsForFolder(id);
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
    date_sent: r.date_sent ? new Date(r.date_sent) : null,
    is_favourite: !!r.is_favourite,
    status: r.status ?? undefined,
    from_email: r.from_email ?? null,
    to_email: r.to_email ?? null,
    subject: r.subject ?? null,
    preview: r.preview ?? null,
    assigned_to: r.assigned_to ?? null,

    has_attachment: hasFlag ?? (countNum !== undefined ? countNum > 0 : undefined),
    attachment_count: typeof r.attachment_count === 'boolean' ? undefined : countNum,
    is_read: toBool(r.is_read) ?? false,
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
