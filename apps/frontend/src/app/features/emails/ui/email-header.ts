/**
 * @file Component displaying header information for an email.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, Signal } from '@angular/core';

import { EmailAssign } from './email-assign';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-header',
  standalone: true,
  imports: [CommonModule, EmailAssign],
  templateUrl: 'email-header.html',
})
export class EmailHeader {
  /** Email to display */
  @Input() public email!: Signal<EmailType | null>;
}
