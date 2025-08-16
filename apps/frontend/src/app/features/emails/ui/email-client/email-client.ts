/**
 * @file Container component for the email client, orchestrating folder, list and details components.
 */
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';

import { EmailsStore } from '../../services/store/emailstore';
import { EmailBody } from '../email-body/email-body';
import { ComposeEmailComponent } from '../email-compose/email-compose';
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

  /** Whether the email body overlay is expanded (signal from store) */
  public readonly isBodyExpanded = this.store.isBodyExpanded;

  /** Currently selected email (signal from store) */
  public readonly selectedEmail = this.store.currentSelectedEmail;

  /** Currently selected folder id (signal from store) */
  public readonly selectedFolderId = this.store.currentSelectedFolderId;

  public closeCompose() {
    this.isComposing.set(false);
  }

  public newEmail() {
    this.isBodyExpanded.set(false); // ensure body overlay is closed
    this.isComposing.set(true);
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
  public onEmail(email: EmailType): void {
    this.store.selectEmail(email);
  }

  /** Handle folder selection from child component */
  public onFolder(folder: EmailFolderType): void {
    this.store.selectFolder(folder);
  }

  public openCompose() {
    this.isBodyExpanded.set(false); // ensure body overlay is closed
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
