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

  protected isFavourite = signal(false);

  /** Email to display */
  public email = input.required<EmailType>();

  /** Get header data from store */
  protected headerData = computed(() => {
    const email = this.email();
    return this.store.getEmailHeaderById(email?.id)();
  });

  constructor() {
    effect(() => {
      console.log(this.email());
      this.isFavourite.set(this.email().is_favourite);
    });
  }

  public getFavouriteIcon() {
    return this.isFavourite() ? 'star-filled' : 'star';
  }

  protected async toggleFavourite() {
    const e = this.email();
    this.isFavourite.set(!this.isFavourite());
    return this.store.toggleEmailFavoriteStatus(e.id, this.isFavourite());
  }

  /** Get TO recipients from header data */
  protected getToRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.to_list || [];
  }

  /** Get CC recipients from header data */
  protected getCcRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.cc_list || [];
  }

  /** Get BCC recipients from header data */
  protected getBccRecipients(): any[] {
    const header = this.headerData();
    return header?.email?.bcc_list || [];
  }

  /** Get all recipients combined */
  protected getAllRecipients(): any[] {
    return [...this.getToRecipients(), ...this.getCcRecipients(), ...this.getBccRecipients()];
  }

  /** Get formatted date from header data */
  protected getDateSent(): Date | null {
    const header = this.headerData();
    return header?.email?.date_sent ? new Date(header.email.date_sent) : null;
  }
}
