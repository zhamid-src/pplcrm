import { describe, expect, it } from 'vitest';

import type { SlaInputs } from './email-sla';
import { computeEmailSla } from './email-sla';

// Jan 5 2026 is a Monday; working week Mon–Fri, 09:00–17:00, 8h email SLA.
const BASE: SlaInputs = {
  status: 'open',
  receivedAt: new Date(2026, 0, 5, 9, 0),
  emailsHours: 8,
  workingDays: '1,2,3,4,5',
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
};

describe('computeEmailSla', () => {
  it('reports a neutral "due in" pill with plenty of time left', () => {
    const now = new Date(2026, 0, 5, 13, 0); // 4 working hours elapsed
    expect(computeEmailSla(BASE, now)).toEqual({ text: 'First response due in 4h · 8h SLA', tone: 'neutral' });
  });

  it('turns warning-tinted when little time remains', () => {
    const now = new Date(2026, 0, 5, 15, 30); // 6.5h elapsed, 1.5h left
    expect(computeEmailSla(BASE, now)).toEqual({ text: 'First response due in 2h · 8h SLA', tone: 'warning' });
  });

  it('turns error-tinted and reports overdue past the target', () => {
    const now = new Date(2026, 0, 6, 11, 0); // Mon 8h + Tue 2h = 10h elapsed
    expect(computeEmailSla(BASE, now)).toEqual({ text: 'First response overdue by 2h · 8h SLA', tone: 'error' });
  });

  it('shows a neutral Closed chip without fabricating a response time', () => {
    expect(computeEmailSla({ ...BASE, status: 'closed' })).toEqual({ text: 'Closed', tone: 'neutral' });
  });

  it('returns null when there is nothing truthful to compute', () => {
    expect(computeEmailSla({ ...BASE, receivedAt: null })).toBeNull();
    expect(computeEmailSla({ ...BASE, emailsHours: null })).toBeNull();
    expect(computeEmailSla({ ...BASE, workingDays: '' })).toBeNull();
  });
});
