/**
 * @file Container component for email details view.
 */
import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';

import { EmailBody } from './email-body';
import { EmailComments } from './email-comments';
import { EmailHeader } from './email-header';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, EmailHeader, EmailBody, EmailComments],
  templateUrl: 'email-details.html',
})
export class EmailDetails {
  public email = input<EmailType | null>(null);
  public commentsExpanded = signal(false);

  public toggleComments(): void {
    this.commentsExpanded.update((v) => !v);
  }
}
