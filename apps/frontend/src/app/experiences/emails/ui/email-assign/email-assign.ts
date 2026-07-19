import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';

import { IAuthUser } from '../../../../../../../../libs/common/src';
import { EmailType } from '../../../../../../../../libs/common/src/lib/models';
import { AuthService } from '../../../../auth/auth-service';
import { UserService } from '../../../../services/user.service';
import { EmailsStore } from '../../services/store/emailstore';

/** Feeds the unique `id`/`anchor-name` pair each instance needs to anchor its popover. */
let nextEmailAssignId = 0;

@Component({
  selector: 'pc-email-assign',
  imports: [Icon],
  template: `<div class="flex items-center gap-2 mt-1">
    <span i18n class="text-xs text-base-content/70">Owner:</span>
    <button
      type="button"
      class="badge badge-xs text-xs badge-info badge-outline cursor-pointer"
      [attr.popovertarget]="menuId"
      [style.anchor-name]="anchorName"
    >
      <span>{{ getUserName(assignedTo()) }}</span>
      <span><pc-icon name="chevron-down" [size]="4"></pc-icon></span>
    </button>

    <!-- Popover-mode dropdown (same idiom as pc-row-actions): open/close state lives in
         the popover, not in :focus-within, so a mousedown that blurs the trigger (Safari
         never focuses clicked buttons) can no longer dismiss the menu before the click
         lands on an item. -->
    <ul
      #menu
      popover
      [id]="menuId"
      [style.position-anchor]="anchorName"
      class="dropdown menu bg-base-100 rounded-box z-[1] w-44 p-2 shadow"
      (click)="closeMenu()"
    >
      @for (user of users(); track user.id) {
        <li>
          <button type="button" (click)="assign(user.id)">{{ isMe(user.id) ? 'Me' : user.first_name }}</button>
        </li>
      }
      @if (assignedTo()) {
        <li><button i18n type="button" (click)="assign(null)">Unassign</button></li>
      }
    </ul>
  </div>`,
  styles: `
    /* Near the bottom of the viewport, drop the menu above the trigger instead of
       off-screen. position-area alone does not reposition itself. */
    ul[popover] {
      position-try-fallbacks: flip-block;
    }
  `,
})
export class EmailAssign {
  private alertSvc = inject(AlertService);
  private auth = inject(AuthService);
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');
  private store = inject(EmailsStore);
  private userService = inject(UserService);

  protected assignedTo = signal<string | null>(null);
  protected readonly anchorName = `--pc-email-assign-${nextEmailAssignId}`;
  protected readonly menuId = `pc-email-assign-${nextEmailAssignId++}`;

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
      this.assignedTo.set(email.assigned_to || null);
    }
  }

  /**
   * Dismiss once an item is chosen. `popover` light-dismisses on outside clicks and
   * Esc, but a click *inside* the menu is not a dismissal to the platform — and every
   * item here is a terminal action, so it is to us.
   */
  public closeMenu() {
    this.menu().nativeElement.hidePopover();
  }

  public getUserName(id: string | null = null) {
    if (!id) return 'Noone';
    if (this.isMe(id)) return 'Me';
    return this.users().find((u) => String(u.id) === String(id))?.first_name || 'Noone';
  }

  /** The current user sees themselves as "Me" — the activity log still records the real name. */
  public isMe(id: string | number | null | undefined) {
    const currentId = this.auth.getUser()?.id;
    return id != null && currentId != null && String(id) === String(currentId);
  }
}
