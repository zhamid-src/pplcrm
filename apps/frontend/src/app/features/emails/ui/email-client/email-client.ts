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
  /** App-level email store */
  protected readonly store = inject(EmailsStore);

  protected isComposing = signal(false);
  protected draftIdToLoad = signal<string | null>(null);
  protected composePrefill = signal<ComposeInitial | null>(null);
  @ViewChild('composer') private composer?: ComposeEmailComponent;

  /** Whether the email body overlay is expanded (signal from store) */
  public readonly isBodyExpanded = this.store.isBodyExpanded;

  /** Currently selected email (signal from store) */
  public readonly selectedEmail = this.store.currentSelectedEmail;

  /** Currently selected folder id (signal from store) */
  public readonly selectedFolderId = this.store.currentSelectedFolderId;

  /** Emails in the currently selected folder */
  public readonly emails = this.store.emailsInSelectedFolder;

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
  public async onEmail(email: EmailType): Promise<void> {
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
    if (folderId === '7') {
      this.draftIdToLoad.set(String(email.id));
      this.isComposing.set(true);
    } else {
      this.store.selectEmail(email);
    }
  }

  /** Handle folder selection from child component */
  public onFolder(folder: EmailFolderType): void {
    this.store.selectFolder(folder);
  }

  public openCompose(prefill?: ComposeInitial | null) {
    this.isBodyExpanded.set(false); // ensure body overlay is closed
    this.draftIdToLoad.set(null);
    this.composePrefill.set(prefill ?? null);
    this.isComposing.set(true);
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

  public onForward(email: EmailType) {
    const subject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
    this.openCompose({ subject });
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
