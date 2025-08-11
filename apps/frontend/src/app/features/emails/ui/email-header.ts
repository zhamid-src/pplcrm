/**
 * @file Component displaying header information for an email.
 */
import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';

import { EmailsService } from '../services/emails-service';
import { EmailAssign } from './email-assign';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-header',
  standalone: true,
  imports: [CommonModule, EmailAssign, Icon],
  templateUrl: 'email-header.html',
})
export class EmailHeader {
  private svc = inject(EmailsService);

  protected isFavourite = signal(false);

  /** Email to display */
  public email = input.required<EmailType>();

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
    return this.svc.setFavourite(e.id, this.isFavourite());
  }
}
