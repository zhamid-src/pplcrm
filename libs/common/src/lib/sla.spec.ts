import { describe, it, expect } from 'vitest';
import { calculateWorkingTimeMs } from './sla';

describe('calculateWorkingTimeMs', () => {
  const workingDays = [1, 2, 3, 4, 5]; // Mon - Fri
  const startHours = '09:00';
  const endHours = '17:00';

  it('should return 0 if start date is after end date', () => {
    const start = new Date('2026-06-01T12:00:00');
    const end = new Date('2026-06-01T11:00:00');
    expect(calculateWorkingTimeMs(start, end, workingDays, startHours, endHours)).toBe(0);
  });

  it('should calculate time within a single working day', () => {
    // 10:00 to 14:00 (4 hours)
    const start = new Date('2026-06-01T10:00:00'); // Monday
    const end = new Date('2026-06-01T14:00:00'); // Monday
    const expected = 4 * 60 * 60 * 1000;
    expect(calculateWorkingTimeMs(start, end, workingDays, startHours, endHours)).toBe(expected);
  });

  it('should cap calculations to working hours', () => {
    // Start before 09:00 (08:00), end after 17:00 (18:00) -> should be exactly 8 hours
    const start = new Date('2026-06-01T08:00:00');
    const end = new Date('2026-06-01T18:00:00');
    const expected = 8 * 60 * 60 * 1000;
    expect(calculateWorkingTimeMs(start, end, workingDays, startHours, endHours)).toBe(expected);
  });

  it('should exclude weekends', () => {
    // Friday 16:00 to Monday 10:00
    // Fri: 16:00 - 17:00 (1 hour)
    // Sat: 0 hours
    // Sun: 0 hours
    // Mon: 09:00 - 10:00 (1 hour)
    // Total should be 2 hours
    const start = new Date('2026-05-29T16:00:00'); // Friday
    const end = new Date('2026-06-01T10:00:00'); // Monday
    const expected = 2 * 60 * 60 * 1000;
    expect(calculateWorkingTimeMs(start, end, workingDays, startHours, endHours)).toBe(expected);
  });

  it('should return 0 if checking completely over a weekend', () => {
    const start = new Date('2026-05-30T08:00:00'); // Saturday
    const end = new Date('2026-05-31T18:00:00'); // Sunday
    expect(calculateWorkingTimeMs(start, end, workingDays, startHours, endHours)).toBe(0);
  });

  it('should fallback to standard elapsed time if settings are malformed', () => {
    const start = new Date('2026-06-01T10:00:00');
    const end = new Date('2026-06-01T12:00:00');
    const expected = 2 * 60 * 60 * 1000;
    expect(calculateWorkingTimeMs(start, end, [], startHours, endHours)).toBe(expected);
    expect(calculateWorkingTimeMs(start, end, workingDays, 'invalid', endHours)).toBe(expected);
  });
});
