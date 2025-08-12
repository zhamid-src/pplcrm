/**
 * @file Component displaying header information for an email.
 */
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';

import { EmailsStore } from '../services/email-store';
import { EmailAssign } from './email-assign';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-header',
  standalone: true,
  imports: [CommonModule, EmailAssign, Icon],
  templateUrl: 'email-header.html',
})
export class EmailHeader {
  private store = inject(EmailsStore);

  /** Get header data from store */
  protected headerData = computed(() => {
    const email = this.email();
    return this.store.getEmailHeaderById(email?.id)();
  });
  protected isClosed = signal(false);
  protected isFavourite = signal(false);

  /** Email to display */
  public email = input.required<EmailType>();

  constructor() {
    effect(() => {
      const email = this.email();
      console.log(email);
      this.isFavourite.set(email.is_favourite);
      this.isClosed.set(email.status === 'closed' || email.status === 'resolved');
    });
  }

  public getFavouriteIcon() {
    return this.isFavourite() ? 'star-filled' : 'star';
  }

  protected expand() {
    console.log('Expand email:', this.email().id);
    // TODO: Implement expand functionality
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

  /** Handle forward action */
  protected handleForward() {
    console.log('Forward email:', this.email().id);
    // TODO: Implement forward functionality
  }

  /** Handle mark as unread action */
  protected handleMarkAsUnread() {
    console.log('Mark as unread:', this.email().id);
    // TODO: Implement mark as unread functionality
  }

  /** Handle reply action */
  protected handleReply() {
    console.log('Reply to email:', this.email().id);
    // TODO: Implement reply functionality
  }

  /** Handle reply all action */
  protected handleReplyAll() {
    console.log('Reply all to email:', this.email().id);
    // TODO: Implement reply all functionality
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
      console.log(`Email ${email.id} status updated to: ${newStatus}`);
    } catch (error) {
      // Revert UI state on error
      this.isClosed.set(currentStatus === 'closed');
      console.error('Failed to update email status:', error);
    }
  }

  protected async toggleFavourite() {
    const e = this.email();
    this.isFavourite.set(!this.isFavourite());
    return this.store.toggleEmailFavoriteStatus(e.id, this.isFavourite());
  }
}
