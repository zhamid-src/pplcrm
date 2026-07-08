import { Component, effect, inject, input, signal } from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';

import { IAuthUser } from '../../../../../../../../libs/common/src';
import { EmailType } from '../../../../../../../../libs/common/src/lib/models';
import { UserService } from '../../../../services/user.service';
import { EmailsStore } from '../../services/store/emailstore';

@Component({
  selector: 'pc-email-assign',
  imports: [Icon],
  template: `<div class="flex items-center gap-2 mt-1">
    <span i18n class="text-xs text-base-content/70">Owner:</span>
    <div class="dropdown">
      <div tabindex="0" class="badge badge-xs text-xs badge-info badge-outline cursor-pointer">
        <span>{{ getUserName(assignedTo()) }}</span>
        <span><pc-icon name="chevron-down" [size]="4"></pc-icon></span>
      </div>

      <ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-44 p-2 shadow">
        @for (user of users(); track user.id) {
          <li>
            <button type="button" (click)="assign(user.id); closeDropdown()">{{ user.first_name }}</button>
          </li>
        }
        @if (assignedTo()) {
          <li><button i18n type="button" (click)="assign(null); closeDropdown()">Unassign</button></li>
        }
      </ul>
    </div>
  </div>`,
})
export class EmailAssign {
  private alertSvc = inject(AlertService);
  private store = inject(EmailsStore);
  private userService = inject(UserService);

  protected assignedTo = signal<string | null>(null);

  public email = input.required<EmailType | null>();
  public users = signal<IAuthUser[]>([]);

  constructor() {
    void this.userService.getUsers().then((u) => this.users.set(u));
    // Can't use computed because assignedTo is settable
    effect(() => {
      this.assignedTo.set(this.email()?.assigned_to || null);
    });
  }

  public async assign(userId: string | number | null) {
    const email = this.email();
    if (!email) return;

    const normalizedUserId = userId != null ? String(userId) : null;
    const assigneeName = normalizedUserId
      ? (this.users().find((u) => String(u.id) === normalizedUserId)?.first_name ?? null)
      : null;

    try {
      await this.store.assignEmailToUser(email.id, normalizedUserId, assigneeName);
      this.assignedTo.set(normalizedUserId);
    } catch (_e) {
      this.alertSvc.showError('Something went wrong, please try again');
      this.assignedTo.set(null);
    }
  }

  public closeDropdown() {
    const el = document.activeElement as HTMLElement | null;
    el?.blur?.(); // remove focus -> :focus-within becomes false -> closes
  }

  public getUserName(id: string | null = null) {
    if (!id) return 'Noone';
    return this.users().find((u) => String(u.id) === String(id))?.first_name || 'Noone';
  }
}
