/**
 * @file Component for assigning an email to a user.
 */
import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { IAuthUser } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';

import { AuthService } from '../../../../auth/auth-service';
import { EmailsStore } from '../../services/store/emailstore';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-assign',
  standalone: true,
  imports: [CommonModule, Icon],
  template: `<div class="flex items-center gap-2 mt-1">
    <span class="text-xs text-base-content/70">Assign to:</span>
    <div class="dropdown">
      <div tabindex="0" class="badge badge-xs text-xs badge-info badge-outline cursor-pointer">
        <span>{{ getUserName(assignedTo()) }}</span>
        <span><pc-icon name="chevron-down" [size]="4"></pc-icon></span>
      </div>

      <ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-44 p-2 shadow">
        @for (user of users(); track user.id) {
          <li>
            <button type="button" (click)="assign(user.id); closeDropdown()"> {{ user.first_name }} </button>
          </li>
        }
        @if (assignedTo()) {
          <li><button type="button" (click)="assign(null); closeDropdown()"> Unassign </button></li>
        }
      </ul>
    </div>
  </div>`,
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
    // Can't use computed because assignedTo is settable
    effect(
      () => {
        this.assignedTo.set(this.email()?.assigned_to || null);
      },
      { allowSignalWrites: true },
    );
  }

  /**
   * Assign the selected email to a user or unassign if `null`.
   */
  public async assign(userId: string | number | null) {
    const email = this.email();
    if (!email) return;

    const normalizedUserId = userId != null ? String(userId) : null;

    try {
      await this.store.assignEmailToUser(email.id, normalizedUserId);
      this.assignedTo.set(normalizedUserId);
    } catch (e) {
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
    return this.users().find((u) => String(u.id) === String(id))?.first_name || 'Not Assigned';
  }
}
