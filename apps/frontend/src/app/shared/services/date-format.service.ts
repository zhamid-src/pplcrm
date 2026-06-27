import { computed, inject, Service } from '@angular/core';
import { formatDate } from '@angular/common';

import { SettingsService } from '../../experiences/settings/services/settings-service';

const DEFAULT_DATE_FORMAT = 'MMMM d, yyyy';

/**
 * Resolves the tenant-wide default date format (Appearance → Date Format) and formats date values
 * with it. Backed by the settings snapshot signal so changes propagate without a reload.
 */
@Service()
export class DateFormatService {
  private readonly settings = inject(SettingsService);

  /** The configured date format pattern, falling back to the project default. */
  public readonly pattern = computed<string>(() => {
    const raw = this.settings.snapshotSignal()['appearance.date_format'];
    return typeof raw === 'string' && raw.trim() ? raw : DEFAULT_DATE_FORMAT;
  });

  /**
   * Formats a date value with the tenant's configured pattern. Returns an empty string for nullish or
   * unparseable input so callers can render their own placeholder.
   */
  public format(value: string | number | Date | null | undefined, pattern?: string): string {
    if (value === null || value === undefined || value === '') return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    try {
      return formatDate(date, pattern ?? this.pattern(), 'en-US');
    } catch {
      return String(value);
    }
  }
}
