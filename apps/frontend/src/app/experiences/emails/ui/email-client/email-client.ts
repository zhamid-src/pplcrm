import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '@uxcommon/components/icons/icon';

import { EmailsService } from '../../services/emails-service';
import { EmailsStore } from '../../services/store/emailstore';
import { EmailStateStore } from '../../services/store/email-state.store';
import { EmailBody } from '../email-body/email-body';
import { ComposeEmailComponent, ComposeInitial } from '../email-compose/email-compose';
import { EmailDetails } from '../email-details/email-details';
import { EmailFolderList } from '../email-folder-list/email-folder-list';
import { EmailList } from '../email-list/email-list';
import { ALL_FOLDERS } from 'common/src/lib/emails';
import type { EmailFolderType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-client',
  imports: [EmailFolderList, EmailList, EmailDetails, EmailBody, ComposeEmailComponent, Icon],
  host: {
    class: 'block h-full',
    '(document:keydown)': 'handleDocumentKeydown($event)',
  },
  templateUrl: 'email-client.html',
})
export class EmailClient {
  private readonly composer = viewChild<ComposeEmailComponent>('composer');

  /** App-level email store */
  protected readonly store = inject(EmailsStore);
  private readonly stateStore = inject(EmailStateStore);
  private readonly route = inject(ActivatedRoute);
  private readonly emailSvc = inject(EmailsService);
  private readonly destroyRef = inject(DestroyRef);

  protected composePrefill = signal<ComposeInitial | null>(null);
  protected draftIdToLoad = signal<string | null>(null);
  protected isComposing = signal(false);

  constructor() {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (params) => {
        const emailId = params['email'];
        if (emailId) {
          try {
            // 1. Fetch the email header/details from backend to know its folder_id
            const res = await this.emailSvc.getEmailHeader(emailId);
            if (res && res.email) {
              const folderId = res.email.folder_id;

              // 2. Ensure folders list is loaded
              let folders = this.store.allFolders();
              if (!folders || folders.length === 0) {
                folders = await this.store.loadAllFoldersWithCounts();
              }

              // 3. Find the folder
              const folder = folders.find((f) => String(f.id) === String(folderId));
              if (folder) {
                const emailObj: EmailType = {
                  id: String(res.email.id),
                  folder_id: String(res.email.folder_id),
                  updated_at: new Date(res.email.updated_at),
                  date_sent: res.email.date_sent ? new Date(res.email.date_sent) : undefined,
                  is_favourite: !!res.email.is_favourite,
                  attachment_count: res.email.attachment_count ?? 0,
                  status: res.email.status || 'open',
                  from_email: res.email.from_email ?? undefined,
                  to_email: res.email.to_email ?? undefined,
                  subject: res.email.subject ?? undefined,
                  preview: res.email.preview ?? undefined,
                  assigned_to: res.email.assigned_to ?? undefined,
                  has_attachment: !!res.email.has_attachment,
                };
                
                // Add to store's normalized map so it is available immediately
                this.stateStore.replaceEmail(emailObj.id, emailObj);

                // Select the folder and email
                this.store.selectFolder(folder);
                this.store.selectEmail(emailObj);
              }
            }
          } catch (err) {
            console.error('Failed to pre-select email from notification link', err);
          }
        }
      });
  }

  /** Emails in the currently selected folder */
  public readonly emails = this.store.emailsInSelectedFolder;

  /** Whether the email body overlay is expanded (signal from store) */
  public readonly isBodyExpanded = this.store.isBodyExpanded;

  /** Currently selected email (signal from store) */
  public readonly selectedEmail = this.store.currentSelectedEmail;

  /** Currently selected folder id (signal from store) */
  public readonly selectedFolderId = this.store.currentSelectedFolderId;

  public closeCompose() {
    this.isComposing.set(false);
    this.draftIdToLoad.set(null);
    this.composePrefill.set(null);
  }

  public newEmail() {
    this.openCompose();
  }

  // handle send from composer
  public async onComposeSend(_payload: any) {
    // TODO: integrate with your EmailActionsStore/EmailsService
    // Example:
    // await this.emailActions.sendEmail(payload);
    this.isComposing.set(false);
    // Optionally refresh current folder, show toast, etc.
  }

  /** Handle email selection from child component */
  public async onEmail(email: EmailType | null): Promise<void> {
    const folderId = this.store.currentSelectedFolderId();
    if (this.isComposing()) {
      try {
        const c = this.composer();
        if (c?.form.dirty) {
          await c.saveDraft();
        }
      } catch (e) {
        console.error('Failed to save draft', e);
      }
      this.closeCompose();
    }

    // Always update the store selection so the list can reflect it
    this.store.selectEmail(email);

    // In the drafts folder, also open the composer for the selected draft
    if (folderId === ALL_FOLDERS.DRAFTS && email) {
      this.draftIdToLoad.set(String(email.id));
      this.isComposing.set(true);
    }
  }

  /** Handle folder selection from child component */
  public onFolder(folder: EmailFolderType): void {
    this.store.selectFolder(folder);
  }

  public onForward(email: EmailType) {
    const subject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
    this.openCompose({ subject });
  }

  public onReply(email: EmailType) {
    const subject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    this.openCompose({ to: email.from_email || '', subject });
  }

  public onReplyAll(email: EmailType) {
    const header = this.store.getEmailHeaderById(email.id)();
    const recipients = new Set<string>();
    if (email.from_email) recipients.add(email.from_email);
    header?.email?.to_list?.forEach((r: any) => recipients.add(r.email));
    header?.email?.cc_list?.forEach((r: any) => recipients.add(r.email));
    const to = Array.from(recipients).join(', ');
    const subject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    this.openCompose({ to, subject });
  }

  public openCompose(prefill?: ComposeInitial | null) {
    this.isBodyExpanded.set(false); // ensure body overlay is closed
    this.draftIdToLoad.set(null);
    this.composePrefill.set(prefill ?? null);
    this.isComposing.set(true);
  }

  /** Toggle the full-screen overlay for email body */
  public toggleExpanded(): void {
    this.store.toggleBodyExpanded();
  }

  /** Collapse the full-screen overlay when Escape is pressed */
  protected handleDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && !ev.repeat && this.isBodyExpanded()) {
      this.store.toggleBodyExpanded();
      ev.preventDefault();
      ev.stopPropagation();
    }
  }
}
