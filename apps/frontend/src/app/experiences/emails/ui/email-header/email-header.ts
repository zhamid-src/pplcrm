import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { TagItem } from '@uxcommon/components/tags/tagitem';
import { Tags } from '@experiences/tags/ui/tags';
import { PersonsService } from '@experiences/persons/services/persons-service';

import { EmailsStore } from '../../services/store/emailstore';
import { EmailAssign } from '../email-assign/email-assign';
import { EmailCreateTaskDialog } from '../email-create-task-dialog/email-create-task-dialog';
import { ALL_FOLDERS } from '../../../../../../../../libs/common/src/lib/emails';
import { EmailType } from '../../../../../../../../libs/common/src/lib/models';

@Component({
  selector: 'pc-email-header',
  // include swap for expand/collapse control
  imports: [DatePipe, UpperCasePipe, EmailAssign, Icon, RouterLink, TagItem, Tags, EmailCreateTaskDialog],
  host: {
    '(document:keydown)': 'handleDocumentKeydown($event)',
  },
  templateUrl: 'email-header.html',
})
export class EmailHeader {
  private alertSvc = inject(AlertService);
  private store = inject(EmailsStore);
  private personsSvc = inject(PersonsService);

  private readonly createTaskDialog = viewChild<EmailCreateTaskDialog>('createTaskDialog');

  protected headerData = computed(() => this.store.getEmailHeaderById(this.email()?.id)());
  protected isClosed = signal(false);
  protected isFavourite = signal(false);

  protected personTags = computed(() => {
    const person = this.headerData()?.person;
    return person?.tags?.map((t: any) => t.name) ?? [];
  });

  protected personIssues = computed(() => {
    const person = this.headerData()?.person;
    return person?.issues?.map((t: any) => t.name) ?? [];
  });

  protected async onTagAdded(tagName: string) {
    const person = this.headerData()?.person;
    if (!person) return;
    try {
      await this.personsSvc.attachTag(person.id, tagName, 'tag');
      this.store.refreshEmailHeader(this.email().id);
      this.alertSvc.showSuccess(`Tag "${tagName}" added`);
    } catch (e) {
      console.error('Failed to attach tag:', e);
      this.alertSvc.showError('Failed to add tag');
    }
  }

  protected async onTagRemoved(tagName: string) {
    const person = this.headerData()?.person;
    if (!person) return;
    try {
      await this.personsSvc.detachTag(person.id, tagName, 'tag');
      this.store.refreshEmailHeader(this.email().id);
      this.alertSvc.showSuccess(`Tag "${tagName}" removed`);
    } catch (e) {
      console.error('Failed to detach tag:', e);
      this.alertSvc.showError('Failed to remove tag');
    }
  }

  protected async onIssueAdded(issueName: string) {
    const person = this.headerData()?.person;
    if (!person) return;
    try {
      await this.personsSvc.attachTag(person.id, issueName, 'issue');
      this.store.refreshEmailHeader(this.email().id);
      this.alertSvc.showSuccess(`Issue "${issueName}" added`);
    } catch (e) {
      console.error('Failed to attach issue:', e);
      this.alertSvc.showError('Failed to add issue');
    }
  }

  protected async onIssueRemoved(issueName: string) {
    const person = this.headerData()?.person;
    if (!person) return;
    try {
      await this.personsSvc.detachTag(person.id, issueName, 'issue');
      this.store.refreshEmailHeader(this.email().id);
      this.alertSvc.showSuccess(`Issue "${issueName}" removed`);
    } catch (e) {
      console.error('Failed to detach issue:', e);
      this.alertSvc.showError('Failed to remove issue');
    }
  }

  public readonly forward = output<void>();
  public readonly reply = output<void>();
  public readonly replyAll = output<void>();

  public email = input.required<EmailType>();

  public isExpanded = this.store.isBodyExpanded;

  constructor() {
    // isFavourite and isClosed are settable, so can't use computed
    effect(() => {
      const email = this.email();

      this.isFavourite.set(email.is_favourite);
      this.isClosed.set(email.status === 'closed');
    });
  }

  public getFavouriteIcon() {
    return this.isFavourite() ? 'star-filled' : 'star';
  }

  protected async deleteEmail() {
    try {
      await this.store.deleteEmail(this.email().id);
    } catch (e) {
      console.error('Failed to delete email', e);
      this.alertSvc.showError('Failed to delete email');
    }
  }

  protected getAllRecipients(): any[] {
    return [...this.getToRecipients(), ...this.getCcRecipients(), ...this.getBccRecipients()];
  }

  protected getBccRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.bcc_list || [];
  }

  protected getCcRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.cc_list || [];
  }

  protected getDateSent(): Date | null {
    const header = this.headerData();
    return header?.email?.date_sent ? new Date(header.email.date_sent) : null;
  }

  protected getHeaderInfo() {
    const header = this.headerData();
    const email = this.email();

    return {
      subject: email.subject,
      date: this.getDateSent() || email.updated_at,
      from: email.from_email,
      to: email.to_email,
      messageId: header?.email?.headers_json?.['message-id'] || 'N/A',
      mailedBy: header?.email?.headers_json?.['x-mailer'] || header?.email?.headers_json?.['user-agent'] || 'N/A',
      signedBy: header?.email?.headers_json?.['dkim-signature'] ? 'DKIM Verified' : 'Not signed',
      security: header?.email?.headers_json?.['received-spf'] || 'N/A',
      returnPath: header?.email?.headers_json?.['return-path'] || 'N/A',
      replyTo: header?.email?.headers_json?.['reply-to'] || email.from_email,
    };
  }

  protected getToRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.to_list || [];
  }

  protected getTrashText() {
    return this.isFolderTrash() ? 'Delete Permanently' : 'Move to Trash';
  }

  protected handleDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.isExpanded()) {
      this.store.toggleBodyExpanded();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  protected handleForward() {
    this.forward.emit();
  }

  protected handleMarkAsUnread() {
    void this.store.toggleEmailReadStatus(this.email().id, false);
    this.store.selectEmail(null);
  }

  protected handleReply() {
    this.reply.emit();
  }

  protected handleReplyAll() {
    this.replyAll.emit();
  }

  protected isFolderTrash(): boolean {
    const fid = this.store.currentSelectedFolderId();
    return fid === ALL_FOLDERS.TRASH;
  }

  protected isFolderSpam(): boolean {
    const fid = this.store.currentSelectedFolderId();
    return fid === ALL_FOLDERS.SPAM;
  }

  protected async markAsSpam() {
    try {
      await this.store.moveToFolder(this.email().id, ALL_FOLDERS.SPAM);
      this.alertSvc.showSuccess('Email marked as spam');
      this.store.selectEmail(null);
    } catch (e) {
      console.error('Failed to mark email as spam', e);
      this.alertSvc.showError('Failed to mark email as spam');
    }
  }

  protected async moveToInbox() {
    try {
      await this.store.moveToFolder(this.email().id, ALL_FOLDERS.INBOX);
      this.alertSvc.showSuccess('Email moved to Inbox');
      this.store.selectEmail(null);
    } catch (e) {
      console.error('Failed to move email to Inbox', e);
      this.alertSvc.showError('Failed to move email to Inbox');
    }
  }

  protected markAsDoneText() {
    return this.isClosed() ? 'Mark as Open' : 'Mark as Done';
  }

  protected restoreFromTrash() {
    this.store.restoreFromTrash(this.email().id);
  }

  protected async toggleClosed() {
    const email = this.email();
    const currentStatus = email.status || 'open';
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    // Optimistically update UI
    this.isClosed.set(newStatus === 'closed');

    try {
      await this.store.updateEmailStatus(email.id, newStatus);
    } catch (_error) {
      // Revert UI state on error
      this.isClosed.set(currentStatus === 'closed');
      this.alertSvc.showError('Failed to update email status');
    }
  }

  protected handleCreateTask(): void {
    void this.createTaskDialog()?.open();
  }

  protected toggleExpand(): void {
    this.store.toggleBodyExpanded();
  }

  protected async toggleFavourite() {
    const e = this.email();
    this.isFavourite.update((value) => !value);
    return this.store.toggleEmailFavoriteStatus(e.id, this.isFavourite());
  }
}
