/**
 * @file Component displaying header information for an email.
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Output, computed, effect, inject, input, signal } from '@angular/core';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Icon } from '@uxcommon/icons/icon';

import { EmailsStore } from '../../services/store/emailstore';
import { EmailAssign } from '../email-assign/email-assign';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-header',
  standalone: true,
  // include swap for expand/collapse control
  imports: [CommonModule, EmailAssign, Icon],
  templateUrl: 'email-header.html',
})
export class EmailHeader {
  private alertSvc = inject(AlertService);
  private store = inject(EmailsStore);

  /** Get header data from store */
  protected headerData = computed(() => this.store.getEmailHeaderById(this.email()?.id)());
  protected isClosed = signal(false);
  protected isFavourite = signal(false);

  /** Email to display */
  public email = input.required<EmailType>();
  @Output() public forward = new EventEmitter<void>();

  /** Whether the email body is currently expanded to take over the window (except sidebar). */
  public isExpanded = this.store.isBodyExpanded;
  @Output() public reply = new EventEmitter<void>();
  @Output() public replyAll = new EventEmitter<void>();

  constructor() {
    effect(() => {
      const email = this.email();

      this.isFavourite.set(email.is_favourite);
      this.isClosed.set(email.status === 'closed');
    });
  }

  public getFavouriteIcon() {
    return this.isFavourite() ? 'star-filled' : 'star';
  }

  /** Get all recipients combined */
  protected getAllRecipients(): any[] {
    return [...this.getToRecipients(), ...this.getCcRecipients(), ...this.getBccRecipients()];
  }

  /** Get BCC recipients from header data */
  protected getBccRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.bcc_list || [];
  }

  /** Get CC recipients from header data */
  protected getCcRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.cc_list || [];
  }

  /** Get formatted date from header data */
  protected getDateSent(): Date | null {
    const header = this.headerData();
    return header?.email?.date_sent ? new Date(header.email.date_sent) : null;
  }

  /** Get additional header information */
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

  /** Get TO recipients from header data */
  protected getToRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.to_list || [];
  }

  /** Handle delete action */
  protected handleDelete() {
    console.log('Delete email:', this.email().id);
    // TODO: Implement delete functionality
  }

  /**
   * Handle Escape key to collapse the expanded view when active.
   */
  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.isExpanded()) {
      this.store.toggleBodyExpanded();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  /** Handle forward action */
  protected handleForward() {
    this.forward.emit();
  }

  /** Handle mark as unread action */
  protected handleMarkAsUnread() {
    console.log('Mark as unread:', this.email().id);
    // TODO: Implement mark as unread functionality
  }

  /** Handle reply action */
  protected handleReply() {
    this.reply.emit();
  }

  /** Handle reply all action */
  protected handleReplyAll() {
    this.replyAll.emit();
  }

  protected markAsDoneText() {
    return this.isClosed() ? 'Mark as Open' : 'Mark as Done';
  }

  /** Toggle email closed status */
  protected async toggleClosed() {
    const email = this.email();
    const currentStatus = email.status || 'open';
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    // Optimistically update UI
    this.isClosed.set(newStatus === 'closed');

    try {
      await this.store.updateEmailStatus(email.id, newStatus);
    } catch (error) {
      // Revert UI state on error
      this.isClosed.set(currentStatus === 'closed');
      this.alertSvc.showError('Failed to update email status');
    }
  }

  /**
   * Toggle the expanded state of the email body.
   * When expanded, the email body fills the main content area, hiding the list and comments.
   */
  protected toggleExpand(): void {
    this.store.toggleBodyExpanded();
  }

  protected async toggleFavourite() {
    const e = this.email();
    this.isFavourite.set(!this.isFavourite());
    return this.store.toggleEmailFavoriteStatus(e.id, this.isFavourite());
  }
}
