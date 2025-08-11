/**
 * @file Component for assigning an email to a user.
 */
import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { IAuthUser } from '@common';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Icon } from '@uxcommon/icons/icon';

import { AuthService } from '../../../auth/auth-service';
import { EmailsStore } from '../services/email-store';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-assign',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: 'email-assign.html',
})
export class EmailAssign {
  private alertSvc = inject(AlertService);
  private auth = inject(AuthService);
  private store = inject(EmailsStore);

  protected assignedTo = signal<string | null>(null);

  /** Email to assign */
  public email = input.required<EmailType | null>();

  /** Available users for assignment */
  public users = signal<IAuthUser[]>([]);

  constructor() {
    this.auth.getUsers().then((u) => this.users.set(u));

    effect(() => {
      this.assignedTo.set(this.email()?.assigned_to || null);
    });
  }

  /**
   * Assign the selected email to a user or unassign if `null`.
   */
  public async assign(userId: string | null) {
    const email = this.email();
    if (!email) return;

    try {
      await this.store.assignEmailToUser(email.id, userId);
      this.assignedTo.set(userId);
    } catch {
      this.alertSvc.showError('Something went wrong, please try again');
      this.assignedTo.set(null);
    }
  }

  public closeDropdown() {
    const el = document.activeElement as HTMLElement | null;
    el?.blur?.(); // remove focus -> :focus-within becomes false -> closes
  }

  /**
   * Get the display name for an assigned user.
   */
  public getUserName(id: string | null = null) {
    if (!id) return 'Not Assigned';
    return this.users().find((u) => u.id === id)?.first_name || 'Not Assigned';
  }
}
