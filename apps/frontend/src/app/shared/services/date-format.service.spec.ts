import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsService } from '../../experiences/settings/services/settings-service';
import { DateFormatService } from './date-format.service';

describe('DateFormatService', () => {
  let service: DateFormatService;
  let snapshot: ReturnType<typeof signal<Record<string, unknown>>>;

  beforeEach(() => {
    snapshot = signal<Record<string, unknown>>({});
    TestBed.configureTestingModule({
      providers: [DateFormatService, { provide: SettingsService, useValue: { snapshotSignal: snapshot } }],
    });
    service = TestBed.inject(DateFormatService);
  });

  it('falls back to the project default pattern when the setting is unset or blank', () => {
    expect(service.pattern()).toBe('MMMM d, yyyy');

    snapshot.set({ 'appearance.date_format': '   ' });
    expect(service.pattern()).toBe('MMMM d, yyyy');
  });

  it('reflects the tenant Appearance setting reactively', () => {
    snapshot.set({ 'appearance.date_format': 'yyyy-MM-dd' });

    expect(service.pattern()).toBe('yyyy-MM-dd');
    expect(service.format('2026-01-15T00:00:00')).toBe('2026-01-15');
  });

  it('formats with the default pattern', () => {
    expect(service.format('2026-01-15T00:00:00')).toBe('January 15, 2026');
    expect(service.format(new Date(2026, 0, 15))).toBe('January 15, 2026');
  });

  it('lets an explicit pattern argument override the tenant setting', () => {
    snapshot.set({ 'appearance.date_format': 'yyyy-MM-dd' });

    expect(service.format('2026-01-15T00:00:00', 'M/d/yy')).toBe('1/15/26');
  });

  it('renders nothing for nullish or empty input so callers can place their own placeholder', () => {
    expect(service.format(null)).toBe('');
    expect(service.format(undefined)).toBe('');
    expect(service.format('')).toBe('');
  });

  it('echoes unparseable input as-is instead of throwing', () => {
    expect(service.format('not-a-date')).toBe('not-a-date');
  });

  it('survives an invalid pattern by echoing the raw value', () => {
    snapshot.set({ 'appearance.date_format': '💥 not a pattern %%%' });

    // formatDate throws on garbage patterns; the service must not propagate that.
    expect(() => service.format('2026-01-15T00:00:00')).not.toThrow();
  });
});
