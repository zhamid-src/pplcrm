/**
 * @file Component displaying the body of an email.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, Signal } from '@angular/core';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'email-body.html',
})
export class EmailBody {
  /** Email to display */
  @Input() public email!: Signal<EmailType | null>;
}
