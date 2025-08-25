/**
 * @file Container component for the email client, orchestrating folder, list and details components.
 */
import { ChangeDetectionStrategy, Component, HostListener, ViewChild, inject, signal } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';

import { EmailsStore } from '../../services/store/emailstore';
import { EmailBody } from '../email-body/email-body';
import { ComposeEmailComponent, ComposeInitial } from '../email-compose/email-compose';
import { EmailDetails } from '../email-details/email-details';
import { EmailFolderList } from '../email-folder-list/email-folder-list';
import { EmailList } from '../email-list/email-list';
import { ALL_FOLDERS } from 'common/src/lib/emails';
import type { EmailFolderType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-client',
  standalone: true,
  imports: [EmailFolderList, EmailList, EmailDetails, EmailBody, ComposeEmailComponent, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  templateUrl: 'email-client.html',
})
export class EmailClient {
  @ViewChild('composer') private composer?: ComposeEmailComponent;

  /** App-level email store */
  protected readonly store = inject(EmailsStore);

  protected composePrefill = signal<ComposeInitial | null>(null);
  protected draftIdToLoad = signal<string | null>(null);
  protected isComposing = signal(false);

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
        if (this.composer?.form.dirty) {
          await this.composer.saveDraft();
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
  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && !ev.repeat && this.isBodyExpanded()) {
      this.store.toggleBodyExpanded();
      ev.preventDefault();
      ev.stopPropagation();
    }
  }
}
