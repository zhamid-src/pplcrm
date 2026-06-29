import * as pino from 'pino';

export const logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});
