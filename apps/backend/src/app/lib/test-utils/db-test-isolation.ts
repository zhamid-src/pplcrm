import type { ControlledTransaction, Transaction } from 'kysely';
import { afterEach, beforeEach } from 'vitest';

import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { BaseRepository } from '../base.repo';

/**
 * Test isolation context handed back by {@link useTestTransaction}.
 *
 * `trx` resolves to the *current* test's transaction (reopened by an internal
 * `beforeEach` before every test), so it's safe to read `ctx.trx` from inside
 * `it(...)` bodies and nested `beforeEach` hooks registered after the call to
 * `useTestTransaction()`.
 */
export interface TestTransactionContext {
  readonly trx: Transaction<Models>;
}

/**
 * Backend specs in this repo run against a real, shared local Postgres
 * instance (see `apps/backend/vite.config.ts`) -- there is no mocking layer.
 * Historically specs seeded rows with random ids in `beforeEach` and manually
 * deleted them in `afterEach`/`finally`, which leaks rows into the shared DB
 * whenever a test fails or the process is killed mid-run.
 *
 * This helper opens a real Postgres transaction before each test and always
 * rolls it back after, so anything written during a test -- via
 * `repo.add(..., trx)`, raw `trx.insertInto(...)`, etc. -- disappears
 * unconditionally, even if the test throws.
 *
 * Kysely's usual `db.transaction().execute(callback)` API scopes the
 * transaction to a single callback, which doesn't fit the
 * `beforeEach`/`it`/`afterEach` lifecycle -- the transaction needs to stay
 * open *across* those hook boundaries. Kysely 0.28 (the version pinned in
 * this repo) added `db.startTransaction().execute()`, which returns a
 * `ControlledTransaction` (a `Transaction` subtype) that can be committed or
 * rolled back manually instead of being tied to a callback -- exactly what's
 * needed here.
 *
 * Usage:
 * ```ts
 * describe('MyRepo', () => {
 *   const ctx = useTestTransaction();
 *
 *   it('adds a row', async () => {
 *     const row = await repo.add({ row: { ... } }, ctx.trx);
 *     expect(row).toBeDefined();
 *   });
 * });
 * ```
 */
export function useTestTransaction(): TestTransactionContext {
  let currentTrx: ControlledTransaction<Models> | undefined;

  beforeEach(async () => {
    currentTrx = await BaseRepository.dbInstance.startTransaction().execute();
  });

  afterEach(async () => {
    if (currentTrx && !currentTrx.isCommitted && !currentTrx.isRolledBack) {
      await currentTrx.rollback().execute();
    }
    currentTrx = undefined;
  });

  return {
    get trx(): Transaction<Models> {
      if (!currentTrx) {
        throw new Error('useTestTransaction(): trx accessed outside of a running test (before beforeEach ran).');
      }
      return currentTrx;
    },
  };
}
