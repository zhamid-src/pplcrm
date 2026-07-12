import { logger } from './app/logger';

type ShutdownHandler = (ctx: { signal: NodeJS.Signals }) => Promise<void> | void;

// How long to let in-flight work drain before force-exiting. The handler stops the job
// workers (which await their in-flight jobs) and closes the HTTP server + DB pool, so this
// must be generous enough for a running job/request to finish. Keep it comfortably under the
// orchestrator's own termination grace period (Kubernetes default is 30s). This timer is a
// fallback for a hung drain, not the normal path — a clean drain clears it and exits 0.
// (The previous 500ms default force-killed every deploy mid-drain.)
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 25_000;

export function onShutdown(
  handler: ShutdownHandler,
  { timeout = DEFAULT_SHUTDOWN_TIMEOUT_MS }: { timeout?: number } = {},
): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  let shuttingDown = false;
  for (const signal of signals) {
    process.on(signal, () => {
      // A second signal mid-drain must not restart the handler or re-arm the kill timer.
      if (shuttingDown) return;
      shuttingDown = true;
      void (async () => {
        const timer = setTimeout(() => {
          logger.error(`Shutdown drain exceeded ${timeout}ms; forcing exit.`);
          process.exit(1);
        }, timeout);
        try {
          await handler({ signal });
          clearTimeout(timer);
          process.exit(0);
        } catch (err) {
          clearTimeout(timer);
          logger.error(err, 'Shutdown handler failed');
          process.exit(1);
        }
      })();
    });
  }
}
