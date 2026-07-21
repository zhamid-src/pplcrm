import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

vi.mock('../../../../env', () => ({
  env: { opsAlertEmail: 'ops@test' as string | undefined },
}));

vi.mock('../reschedule', () => ({
  FIVE_MINUTES_MS: 5 * 60 * 1000,
  scheduleNextRun: vi.fn(async () => undefined),
}));

import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { env } from '../../../../env';
import { TransactionalEmailService } from '../../mail/transactional-mail.service';
import type { SendMailOptions } from '../../mail/transactional-mail.service';
import { FIVE_MINUTES_MS, scheduleNextRun } from '../reschedule';
import { handleOpsWatchdog } from './ops.handlers';

/**
 * Minimal Kysely stand-in: each table maps to a QUEUE of results, consumed one per executed
 * query (the watchdog hits background_jobs twice — failed groups, then backlog). Inserts are
 * recorded for heartbeat assertions.
 */
function makeFakeDb(queues: Record<string, unknown[]>) {
  const inserts: { table: string; values: Record<string, unknown> }[] = [];
  const nextResult = (table: string): unknown => (queues[table] ?? []).shift();
  const makeBuilder = (table: string): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    const chain = (): Record<string, unknown> => b;
    for (const m of ['select', 'where', 'groupBy', 'onConflict']) b[m] = vi.fn(chain);
    b['values'] = vi.fn((values: Record<string, unknown>): Record<string, unknown> => {
      inserts.push({ table, values });
      return b;
    });
    b['execute'] = vi.fn(async () => nextResult(table) ?? []);
    b['executeTakeFirst'] = vi.fn(async () => nextResult(table));
    return b;
  };
  const db = {
    selectFrom: vi.fn((t: string) => makeBuilder(String(t))),
    insertInto: vi.fn((t: string) => makeBuilder(String(t))),
  };
  // The fake only implements the chain surface the handler uses.
  return { db: db as unknown as Kysely<Models>, inserts };
}

const QUIET: Record<string, unknown[]> = {
  ops_heartbeats: [{ details: null }],
  background_jobs: [[], { oldest_run_at: null }],
  webhook_events: [[]],
  tenants: [[]],
};

function withFailures(overrides: Partial<Record<string, unknown[]>> = {}): Record<string, unknown[]> {
  return {
    ops_heartbeats: [{ details: null }],
    background_jobs: [[{ key: 'geocode_household', count: 2, sample_error: 'boom' }], { oldest_run_at: null }],
    webhook_events: [[]],
    tenants: [[]],
    ...overrides,
  };
}

describe('handleOpsWatchdog', () => {
  let sendMail: MockInstance<(options: SendMailOptions) => Promise<void>>;

  beforeEach(() => {
    env.opsAlertEmail = 'ops@test';
    sendMail = vi.spyOn(TransactionalEmailService.prototype, 'sendMail').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('quiet cycle: no email, but the heartbeat beats and the next run is scheduled', async () => {
    const { db, inserts } = makeFakeDb({ ...QUIET });

    await handleOpsWatchdog(db);

    expect(sendMail).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.table).toBe('ops_heartbeats');
    expect(inserts[0]?.values['name']).toBe('ops_watchdog');
    expect(scheduleNextRun).toHaveBeenCalledWith(db, 'ops_watchdog', FIVE_MINUTES_MS);
  });

  it('emails a digest of newly failed jobs and stamps the alert fingerprint', async () => {
    const { db, inserts } = makeFakeDb(withFailures());

    await handleOpsWatchdog(db);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('ops@test');
    expect(mail.subject).toContain('2 failed jobs');
    expect(mail.text).toContain('geocode_household');
    expect(mail.text).toContain('boom');

    const details = JSON.parse(String(inserts[0]?.values['details'])) as Record<string, unknown>;
    expect(details['last_alert_fingerprint']).toBe('job:geocode_household');
    expect(details['last_alerted_at']).toBeTruthy();
    expect(details['last_checked_at']).toBeTruthy();
  });

  it('suppresses a repeat of the same findings within the suppression window', async () => {
    const { db } = makeFakeDb(
      withFailures({
        ops_heartbeats: [
          {
            details: {
              last_checked_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              last_alert_fingerprint: 'job:geocode_household',
              last_alerted_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            },
          },
        ],
      }),
    );

    await handleOpsWatchdog(db);

    expect(sendMail).not.toHaveBeenCalled();
    expect(scheduleNextRun).toHaveBeenCalled();
  });

  it('alerts again when the findings change even inside the window', async () => {
    const { db } = makeFakeDb(
      withFailures({
        ops_heartbeats: [
          {
            details: {
              last_checked_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              last_alert_fingerprint: 'job:some_other_type',
              last_alerted_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            },
          },
        ],
      }),
    );

    await handleOpsWatchdog(db);

    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('flags a jammed queue via the oldest runnable pending job', async () => {
    const { db } = makeFakeDb({
      ops_heartbeats: [{ details: null }],
      background_jobs: [[], { oldest_run_at: new Date(Date.now() - 30 * 60 * 1000) }],
      webhook_events: [[]],
      tenants: [[]],
    });

    await handleOpsWatchdog(db);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toContain('queue backlog');
    expect(mail.text).toContain('Queue backlog');
  });

  it('still beats the heartbeat when OPS_ALERT_EMAIL is unset (findings only logged)', async () => {
    env.opsAlertEmail = undefined;
    const { db, inserts } = makeFakeDb(withFailures());

    await handleOpsWatchdog(db);

    expect(sendMail).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.table).toBe('ops_heartbeats');
    expect(scheduleNextRun).toHaveBeenCalled();
  });
});
