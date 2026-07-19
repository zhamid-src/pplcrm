import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../env', () => ({
  env: { apiUrl: 'https://api.test', sharedSecret: 'test-secret', sendgridFreeTierSubuser: '' },
}));

import { evaluateSendCondition } from './workflows.handlers';

const OPENED = { opened_at: new Date('2026-07-01T00:00:00Z'), clicked_at: null };
const CLICKED = { opened_at: new Date('2026-07-01T00:00:00Z'), clicked_at: new Date('2026-07-01T01:00:00Z') };
const UNTOUCHED = { opened_at: null, clicked_at: null };

describe('evaluateSendCondition', () => {
  it('previous_not_opened sends only when the previous email went unopened', () => {
    expect(evaluateSendCondition('previous_not_opened', UNTOUCHED)).toEqual({ send: true });
    expect(evaluateSendCondition('previous_not_opened', OPENED).send).toBe(false);
    expect(evaluateSendCondition('previous_not_opened', CLICKED).send).toBe(false);
  });

  it('previous_not_clicked tolerates opens but not clicks', () => {
    expect(evaluateSendCondition('previous_not_clicked', OPENED)).toEqual({ send: true });
    expect(evaluateSendCondition('previous_not_clicked', CLICKED).send).toBe(false);
  });

  it('previous_opened and previous_clicked require the engagement', () => {
    expect(evaluateSendCondition('previous_opened', OPENED)).toEqual({ send: true });
    expect(evaluateSendCondition('previous_opened', UNTOUCHED).send).toBe(false);
    expect(evaluateSendCondition('previous_clicked', CLICKED)).toEqual({ send: true });
    expect(evaluateSendCondition('previous_clicked', OPENED).send).toBe(false);
  });

  it('with no earlier email, negative conditions send and positive conditions skip', () => {
    expect(evaluateSendCondition('previous_not_opened', null)).toEqual({ send: true });
    expect(evaluateSendCondition('previous_not_clicked', null)).toEqual({ send: true });
    expect(evaluateSendCondition('previous_opened', null).send).toBe(false);
    expect(evaluateSendCondition('previous_clicked', null).send).toBe(false);
  });

  it('skip verdicts carry a human-readable narration', () => {
    const verdict = evaluateSendCondition('previous_not_opened', OPENED);
    expect(verdict.send).toBe(false);
    if (!verdict.send) expect(verdict.reason).toMatch(/opened the previous email/);
  });
});
