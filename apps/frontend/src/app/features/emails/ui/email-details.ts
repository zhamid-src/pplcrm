/**
 * @file Container component for email details view.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { EmailType } from 'common/src/lib/models';

import { EmailBody } from './email-body';
import { EmailComments } from './email-comments';
import { EmailHeader } from './email-header';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, EmailHeader, EmailBody, EmailComments],
  templateUrl: 'email-details.html',
})
export class EmailDetails {
  /** Email to display details for */
  @Input() public email = signal<EmailType | null>(null);
}
