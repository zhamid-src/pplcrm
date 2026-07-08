import { Service } from '@angular/core';
import { EmailStatus, JSend, jsend } from '../../../../../../../libs/common/src';

import { HasRow } from '../../../../../../../libs/common/src/lib/emails';
import { EmailDraftType, EmailType } from '../../../../../../../libs/common/src/lib/models';
import { environment } from '../../../../environments/environment';
import { TRPCService } from '../../../services/api/trpc-service';
import { ComposePayload, DraftPayload } from '../ui/email-compose/email-compose';

@Service()
export class EmailsService extends TRPCService<'emails' | 'email_list'> {
  public addComment(id: string, author_id: string, comment: string) {
    return this.api.emails.addComment.mutate({ id, author_id, comment });
  }

  public assign(id: string, user_id: string | null, assigned_to_name?: string | null) {
    return this.api.emails.assign.mutate({ id, user_id, assigned_to_name: assigned_to_name ?? undefined });
  }

  public delete(id: string) {
    return this.api.emails.delete.mutate(id);
  }

  public deleteComment(email_id: string, comment_id: string) {
    return this.api.emails.deleteComment.mutate({ email_id, comment_id });
  }

  public deleteDraft(id: string) {
    return this.api.emails.deleteDraft.mutate({ id });
  }

  public deleteMany(ids: string[]) {
    return this.api.emails.deleteMany.mutate(ids);
  }

  public getAllAttachments(id: string, options?: { includeInline: boolean }) {
    return this.api.emails.getAllAttachments.query({ email_id: id, options });
  }

  public getAttachmentsByEmailId(id: string) {
    return this.api.emails.getAttachmentsByEmailId.query(id);
  }

  public getDraft(id: string) {
    return this.api.emails.getDraft.query(id) as Promise<EmailDraftType>;
  }

  public getEmailBody(id: string) {
    return this.api.emails.getEmailBody.query(id);
  }

  public getEmailHeader(id: string) {
    return this.api.emails.getEmailHeader.query(id);
  }

  public getEmailWithHeaders(id: string) {
    return this.api.emails.getEmailWithHeaders.query(id);
  }

  public getActivities(emailId: string) {
    return this.api.emails.getActivities.query(emailId);
  }

  // TODO: paging and infinite scrolling
  public getEmails(folderId: string, limit?: number, offset?: number) {
    return this.api.emails.getEmails.query({ folderId, limit, offset });
  }

  public getFolders() {
    return this.api.emails.getFolders.query();
  }

  public getFoldersWithCounts() {
    return this.api.emails.getFoldersWithCounts.query();
  }

  public hasAttachment(id: string) {
    return this.api.emails.hasAttachment.query(id);
  }

  public async hasAttachmentByEmailIds(ids: string[]): Promise<Partial<Record<string, boolean>>> {
    const rows: HasRow[] = await this.api.emails.hasAttachmentByEmailIds.query(ids);
    const map: Record<string, boolean> = {};
    for (const r of rows) map[String(r.email_id)] = !!r.has;
    return map;
  }

  public restoreFromTrash(ids: string[]): Promise<number> {
    return this.api.emails.restoreFromTrash.mutate(ids);
  }

  public moveToFolder(id: string, folderId: string) {
    return this.api.emails.moveToFolder.mutate({ id, folderId });
  }

  public saveDraft(input: DraftPayload) {
    return this.api.emails.saveDraft.mutate(input);
  }

  // Fetch/FormData fallback
  public async sendEmail(input: ComposePayload): Promise<EmailType> {
    const fd = new FormData();
    fd.set('to', JSON.stringify(input.to));
    fd.set('cc', JSON.stringify(input.cc));
    fd.set('bcc', JSON.stringify(input.bcc));
    fd.set('subject', input.subject);
    fd.set('html', input.html);
    input.attachments.forEach((f) => fd.append('attachments', f, f.name));

    const token = this.tokenService.getAuthToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${environment.apiUrl}/api/emails/send`, { method: 'POST', body: fd, headers });
    const json = (await res.json()) as JSend<EmailType>;
    return jsend.unwrap(json);
  }

  public setFavourite(id: string, favourite: boolean) {
    return this.api.emails.setFavourite.mutate({ id, favourite });
  }

  public setStatus(id: string, status: EmailStatus) {
    return this.api.emails.setStatus.mutate({ id, status });
  }

  public setEmailReadStatus(id: string, isRead: boolean) {
    return this.api.emails.setEmailReadStatus.mutate({ id, isRead });
  }

  public async syncEmails(): Promise<{ inserted: number }> {
    let msResult = { inserted: 0 };
    let googleResult = { inserted: 0 };
    let msConnected = false;
    let googleConnected = false;

    // Check MS connection status
    try {
      const msStatus = await this.api.msSync.getConnectionStatus.query();
      if (msStatus?.connected) {
        msConnected = true;
        msResult = await (
          this.api.msSync.syncNow.mutate as unknown as (input: any, opts?: any) => Promise<{ inserted: number }>
        )(undefined, { context: { skipErrorHandler: true } });
      }
    } catch (e) {
      console.error('MS sync failed:', e);
    }

    // Check Google connection status
    try {
      const googleStatus = await this.api.googleSync.getConnectionStatus.query();
      if (googleStatus?.connected) {
        googleConnected = true;
        googleResult = await (
          this.api.googleSync.syncNow.mutate as unknown as (input: any, opts?: any) => Promise<{ inserted: number }>
        )(undefined, { context: { skipErrorHandler: true } });
      }
    } catch (e) {
      console.error('Google sync failed:', e);
    }

    if (!msConnected && !googleConnected) {
      throw new Error('No email accounts connected');
    }

    return { inserted: msResult.inserted + googleResult.inserted };
  }

  public getConnectionStatus() {
    return this.api.msSync.getConnectionStatus.query();
  }

  public async isAnySyncing(): Promise<boolean> {
    let isSyncing = false;
    try {
      const msStatus = await this.api.msSync.getConnectionStatus.query();
      if (msStatus?.syncing) isSyncing = true;
    } catch (_e) {
      // ignore
    }
    try {
      const googleStatus = await this.api.googleSync.getConnectionStatus.query();
      if (googleStatus?.syncing) isSyncing = true;
    } catch (_e) {
      // ignore
    }
    return isSyncing;
  }
}
