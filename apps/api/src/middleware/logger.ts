import pinoHttp from 'pino-http';
import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: 'info',
  transport: config.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    userId: (req as any).userId ?? 'anonymous',
  }),
  customLogLevel: (_req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
