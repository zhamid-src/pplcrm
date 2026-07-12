import type { CompanionPersonResult, KnockResponse } from '@common';
import { KNOCK_RESPONSE_LABELS } from '@common';

import type { DoorStatus } from './canvass-derive';

/** Small presentational helpers shared by the canvass views. No state. */

/** DaisyUI badge classes for a derived door status — color only where it means something (§5). */
export function statusBadgeClass(status: DoorStatus): string {
  switch (status) {
    case 'canvassed':
      return 'badge badge-success';
    case 'dnc':
    case 'outcome:refused':
      return 'badge badge-error';
    case 'outcome:no_answer':
    case 'outcome:inaccessible':
      return 'badge badge-warning';
    case 'in_progress':
      return 'badge badge-info badge-outline';
    case 'not_visited':
      return 'badge badge-ghost';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase() || '?';
}

/** Label for a door's surveyed stance, including the disagreement case. */
export function consensusLabel(consensus: KnockResponse | 'mixed' | null): string | null {
  if (consensus == null) return null;
  return consensus === 'mixed' ? 'Mixed support' : KNOCK_RESPONSE_LABELS[consensus];
}

/** Chip label for a person's recorded result. */
export function personResultLabel(result: CompanionPersonResult, support: KnockResponse | null): string {
  switch (result) {
    case 'canvassed':
      return support != null ? KNOCK_RESPONSE_LABELS[support] : 'Surveyed';
    case 'not_home':
      return 'Not home';
    case 'moved':
      return 'Moved';
    case 'refused':
      return 'Refused';
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
