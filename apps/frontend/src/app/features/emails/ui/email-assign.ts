/**
 * @file Component for assigning an email to a user.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, WritableSignal, inject, signal } from '@angular/core';
import { IAuthUser } from '@common';
import { Icon } from '@uxcommon/icons/icon';

import { AuthService } from '../../../auth/auth-service';
import { EmailsService } from '../services/emails-service';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-assign',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: 'email-assign.html',
})
export class EmailAssign {
  private auth = inject(AuthService);
  private svc: EmailsService = inject(EmailsService);

  /** Email to assign */
  @Input() public email!: WritableSignal<EmailType | null>;

  /** Available users for assignment */
  public users = signal<IAuthUser[]>([]);

  constructor() {
    this.auth.getUsers().then((u) => this.users.set(u));
  }

  /**
   * Assign the selected email to a user or unassign if `null`.
   */
  public async assign(userId: string | null) {
    const email = this.email();
    if (!email) return;
    await this.svc.assign(email.id, userId);
    this.email.set({ ...email, assigned_to: userId || undefined });
  }

  /**
   * Get the display name for an assigned user.
   */
  public getUserName(id?: string) {
    if (!id) return 'Not Assigned';
    return this.users().find((u) => u.id === id)?.first_name || 'Not Assigned';
  }
}
