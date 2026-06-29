import { logger } from './app/logger';

export function onShutdown(handler: any, { timeout = 500 } = {}) {
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, () => {
      void (async () => {
        const timer = setTimeout(() => process.exit(1), timeout);
        try {
          void (await handler({ signal }));
          clearTimeout(timer);
          process.exit(0);
        } catch (err) {
          logger.error(err, 'Shutdown handler failed');
          process.exit(1);
        }
      })();
    });
  }
}
