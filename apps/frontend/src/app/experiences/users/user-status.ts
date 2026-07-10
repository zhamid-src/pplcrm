import type { PcStatusType } from '@uxcommon/components/status-badge/status-badge';

/**
 * Lifecycle/role derivations shared by the Users list and the user detail page,
 * so the two surfaces can never disagree about what "Deactivated" or a locked
 * role means. Date fields accept ISO strings (list rows) or Dates (detail).
 */
export interface UserStatusSource {
  verified: boolean;
  deletion_scheduled_at?: string | Date | null;
  deactivated_at?: string | Date | null;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Admin-deactivated OR self-scheduled deletion: either way the account is out of service. */
export function userIsDeactivated(u: UserStatusSource): boolean {
  return !!u.deactivated_at || !!u.deletion_scheduled_at;
}

export function userStatus(u: UserStatusSource): { label: string; tone: PcStatusType } {
  if (userIsDeactivated(u)) return { label: 'Deactivated', tone: 'ghost' };
  if (!u.verified) return { label: 'Invited', tone: 'warning' };
  return { label: 'Active', tone: 'success' };
}

/** Why this user's role can't be changed — null when it can. Doubles as the visible reason (§2 explained-disabled). */
export function userRoleLockReason(opts: {
  isSelf: boolean;
  callerRole: string | null | undefined;
  targetRole: string | null | undefined;
  deactivated: boolean;
}): string | null {
  if (opts.isSelf) return "You can't change your own role";
  if (opts.deactivated) return 'Deactivated accounts keep their role';
  if (opts.callerRole === 'admin' && opts.targetRole === 'owner') return "Only an owner can change an owner's role";
  return null;
}

/** Roles the caller may assign; includes the target's current role so the select never shows blank. */
export function userRoleOptions(
  callerRole: string | null | undefined,
  targetRole: string | null | undefined,
): string[] {
  const options = callerRole === 'owner' ? ['owner', 'admin', 'user', 'viewer'] : ['admin', 'user', 'viewer'];
  if (targetRole && !options.includes(targetRole)) return [targetRole, ...options];
  return options;
}

export function userShortDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function userRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return '—';
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 2 * DAY) return 'Yesterday';
  return userShortDate(date);
}

/** "Last active" cell/fact: invited accounts show when the invite went out instead of a dash. */
export function userLastActiveLabel(
  u: UserStatusSource & { created_at?: string | Date | null; last_active_at?: string | Date | null },
): string {
  if (!u.verified && !userIsDeactivated(u)) {
    const sent = userShortDate(u.created_at);
    return sent ? `Invite sent ${sent}` : 'Invite sent';
  }
  if (!u.last_active_at) return '—';
  return userRelativeTime(u.last_active_at);
}
