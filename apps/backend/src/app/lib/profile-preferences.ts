import { ProfilePreferencesObj } from '../../../../../libs/common/src';
import type { ProfilePreferencesType } from '../../../../../libs/common/src';

import { logger } from '../logger';

export type NotificationPreferenceKey = keyof NonNullable<ProfilePreferencesType['notifications']>;

/**
 * Parse a profiles.preferences value into its typed shape. The column is
 * jsonb (arrives pre-parsed from Kysely), but legacy writers stored JSON
 * strings — both are accepted. Returns null (and logs) on malformed data so
 * callers fall back to default behavior instead of crashing a mail path.
 */
export function parseProfilePreferences(value: unknown): ProfilePreferencesType | null {
  if (value == null) return null;
  let candidate: unknown = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch (err) {
      logger.error({ err }, 'Failed to parse profile preferences JSON string');
      return null;
    }
  }
  const result = ProfilePreferencesObj.safeParse(candidate);
  if (!result.success) {
    logger.error({ err: result.error }, 'Profile preferences failed schema validation');
    return null;
  }
  return result.data;
}

/**
 * True unless the user explicitly turned the given notification off.
 * Missing preferences, missing keys, and malformed data all mean "enabled" —
 * notifications are opt-out.
 */
export function notificationEnabled(preferences: unknown, key: NotificationPreferenceKey): boolean {
  return parseProfilePreferences(preferences)?.notifications?.[key] !== false;
}
