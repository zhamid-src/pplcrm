export function onShutdown(handler: any, { timeout = 500 } = {}) {
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      const timer = setTimeout(() => process.exit(1), timeout);
      try {
        await handler({ signal });
        clearTimeout(timer);
        process.exit(0);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });
  }
}
