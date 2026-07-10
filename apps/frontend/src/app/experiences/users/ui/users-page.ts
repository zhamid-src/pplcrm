import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { StatusBadge } from '@uxcommon/components/status-badge/status-badge';
import type { PcStatusType } from '@uxcommon/components/status-badge/status-badge';
import { Table } from '@uxcommon/components/table/table';
import { UserAvatarComponent } from '@uxcommon/components/user-avatar/user-avatar';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';
import { UserService } from '@frontend/services/user.service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { UserAdminService } from '../services/useradmin-service';
import { InviteUserDialog, PLAN_LABELS, type SeatUsage } from './invite-user-dialog';

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
  verified: boolean;
  two_factor_enabled: boolean;
  deletion_scheduled_at: string | null;
  last_active_at: string | null;
  created_at: string | null;
  avatar_url: string | null;
}

// The stored role value for the working role is 'user'; the product name for it is "Editor"
// (see the Users & roles help article and the approved design).
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  user: 'Editor',
  viewer: 'Viewer',
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Users admin page — staff logins for this workspace. A bespoke `pc-table` (not the datagrid):
 * inline role select with explained locks, honest status/MFA/last-active columns derived from
 * real session data, and the seat-aware "Invite user" dialog.
 */
@Component({
  selector: 'pc-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StatusBadge, Table, UserAvatarComponent, InviteUserDialog, GridHeaderComponent],
  templateUrl: './users-page.html',
})
export class UsersPageComponent implements OnInit {
  private readonly users = inject(UserAdminService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(AlertService);
  private readonly userService = inject(UserService);

  private readonly inviteDlg = viewChild.required(InviteUserDialog);

  protected readonly loading = createLoadingGate();
  protected readonly loaded = signal(false);
  protected readonly rows = signal<UserRow[]>([]);
  protected readonly seatUsage = signal<SeatUsage | null>(null);

  /** Row that just saved a role change — drives the one-shot saved flash. */
  protected readonly flashedId = signal<string | null>(null);
  /** Rows with an in-flight role change; their select is disabled while saving. */
  protected readonly savingIds = signal<ReadonlySet<string>>(new Set());

  protected readonly currentUserId = computed(() => {
    const id = this.auth.getUser()?.id;
    return id != null ? String(id) : null;
  });
  protected readonly currentUserRole = computed(() => this.auth.getUser()?.role ?? null);

  protected readonly activeCount = computed(
    () => this.rows().filter((r) => r.verified && !r.deletion_scheduled_at).length,
  );
  protected readonly invitedCount = computed(
    () => this.rows().filter((r) => !r.verified && !r.deletion_scheduled_at).length,
  );
  protected readonly deactivatedCount = computed(() => this.rows().filter((r) => !!r.deletion_scheduled_at).length);
  protected readonly adminCount = computed(
    () => this.rows().filter((r) => (r.role === 'admin' || r.role === 'owner') && !r.deletion_scheduled_at).length,
  );

  protected readonly seatsRemaining = computed(() => {
    const usage = this.seatUsage();
    return usage ? Math.max(0, usage.seatLimit - usage.seatsUsed) : null;
  });

  protected readonly planLabel = computed(() => {
    const usage = this.seatUsage();
    return usage ? (PLAN_LABELS[usage.plan] ?? usage.plan) : '';
  });

  /** Header grain sentence, e.g. "5 users · 3 active, 1 invited · 2 admins · 4 of 10 seats on the Team plan". */
  protected readonly headerSentence = computed(() => {
    const total = this.rows().length;
    const parts = [`${total} user${total === 1 ? '' : 's'}`];
    const statusBits = [`${this.activeCount()} active`];
    if (this.invitedCount() > 0) statusBits.push(`${this.invitedCount()} invited`);
    if (this.deactivatedCount() > 0) statusBits.push(`${this.deactivatedCount()} deactivated`);
    parts.push(statusBits.join(', '));
    parts.push(`${this.adminCount()} admin${this.adminCount() === 1 ? '' : 's'}`);
    const usage = this.seatUsage();
    if (usage) parts.push(`${usage.seatsUsed} of ${usage.seatLimit} seats on the ${this.planLabel()} plan`);
    return parts.join(' · ');
  });

  public ngOnInit(): void {
    void this.load();
  }

  protected openInvite(): void {
    this.inviteDlg().open();
  }

  protected onInvited(): void {
    void this.load();
  }

  protected displayName(row: UserRow): string {
    return `${row.first_name} ${row.last_name}`.trim() || row.email;
  }

  protected avatarUrl(row: UserRow): string | null {
    return row.avatar_url ? (this.userService.resolveAvatarUrl(row.avatar_url) ?? null) : null;
  }

  protected isSelf(row: UserRow): boolean {
    return row.id === this.currentUserId();
  }

  protected roleLabel(role: string | null): string {
    return role ? (ROLE_LABELS[role] ?? role) : '—';
  }

  /** Roles the caller may assign on this row; includes the row's current role so the select never shows blank. */
  protected roleOptions(row: UserRow): string[] {
    const options =
      this.currentUserRole() === 'owner' ? ['owner', 'admin', 'user', 'viewer'] : ['admin', 'user', 'viewer'];
    if (row.role && !options.includes(row.role)) return [row.role, ...options];
    return options;
  }

  /** Why this row's role can't be changed — null when it can. Doubles as the tooltip copy (§2 explained-disabled). */
  protected roleLockReason(row: UserRow): string | null {
    if (this.isSelf(row)) return "You can't change your own role";
    if (row.deletion_scheduled_at) return 'Deactivated accounts keep their role';
    if (this.currentUserRole() === 'admin' && row.role === 'owner') return "Only an owner can change an owner's role";
    return null;
  }

  protected status(row: UserRow): { label: string; tone: PcStatusType } {
    if (row.deletion_scheduled_at) return { label: 'Deactivated', tone: 'ghost' };
    if (!row.verified) return { label: 'Invited', tone: 'warning' };
    return { label: 'Active', tone: 'success' };
  }

  protected lastActiveText(row: UserRow): string {
    if (!row.verified && !row.deletion_scheduled_at) {
      return row.created_at ? `Invite sent ${this.shortDate(row.created_at)}` : 'Invite sent';
    }
    if (!row.last_active_at) return '—';
    return this.relativeTime(new Date(row.last_active_at));
  }

  protected async changeRole(row: UserRow, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const role = select.value;
    if (!role || role === row.role) return;

    this.savingIds.update((ids) => new Set(ids).add(row.id));
    try {
      await this.users.update(row.id, { role });
      this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, role } : r)));
      this.flashRow(row.id);
      this.alerts.showSuccess(`Role updated — ${this.displayName(row)} is now ${this.roleLabel(role)}`);
    } catch (err) {
      select.value = row.role ?? '';
      const message = err instanceof Error && err.message ? err.message : 'Unable to update the role';
      this.alerts.showError(message);
    } finally {
      this.savingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(row.id);
        return next;
      });
    }
  }

  protected async sendPasswordReset(row: UserRow): Promise<void> {
    try {
      await this.users.adminTriggerPasswordReset(row.id);
      this.alerts.showSuccess(`Password reset email sent to ${row.email}`);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Unable to send the reset email';
      this.alerts.showError(message);
    }
  }

  private async load(): Promise<void> {
    const end = this.loading.begin();
    try {
      const [list, seats] = await Promise.all([
        this.users.getAll({ startRow: 0, endRow: 500 }),
        this.users.getSeatUsage(),
      ]);
      this.rows.set(list.rows.map((raw) => this.toRow(raw)));
      this.seatUsage.set(seats);
      this.loaded.set(true);
    } catch {
      this.alerts.showError('Unable to load users — try refreshing the page');
    } finally {
      end();
    }
  }

  private toRow(raw: Record<string, unknown>): UserRow {
    return {
      id: raw['id'] != null ? String(raw['id']) : '',
      email: typeof raw['email'] === 'string' ? raw['email'] : '',
      first_name: typeof raw['first_name'] === 'string' ? raw['first_name'] : '',
      last_name: typeof raw['last_name'] === 'string' ? raw['last_name'] : '',
      role: typeof raw['role'] === 'string' ? raw['role'] : null,
      verified: raw['verified'] === true,
      two_factor_enabled: raw['two_factor_enabled'] === true,
      deletion_scheduled_at: this.toIso(raw['deletion_scheduled_at']),
      last_active_at: this.toIso(raw['last_active_at']),
      created_at: this.toIso(raw['created_at']),
      avatar_url: typeof raw['avatar_url'] === 'string' ? raw['avatar_url'] : null,
    };
  }

  private toIso(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' && value) return value;
    return null;
  }

  private flashRow(id: string): void {
    this.flashedId.set(id);
    const FLASH_MS = 1300;
    setTimeout(() => {
      if (this.flashedId() === id) this.flashedId.set(null);
    }, FLASH_MS);
  }

  private relativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    if (Number.isNaN(diff)) return '—';
    if (diff < MINUTE) return 'Just now';
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
    if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
    if (diff < 2 * DAY) return 'Yesterday';
    return this.shortDate(date.toISOString());
  }

  private shortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
