import 'dotenv/config';
import { config } from './config';
import { initSentry, Sentry } from './lib/sentry';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { httpLogger, logger } from './middleware/logger';
import { apiRateLimit } from './middleware/rateLimit';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import messagesRouter from './routes/messages';

initSentry();

export const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL ?? '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(httpLogger);
app.use(apiRateLimit);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/rooms', roomsRouter);
app.use('/rooms/:roomId/messages', messagesRouter);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  Sentry.captureException(err);
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(config.PORT, () => {
    logger.info(`API server listening on port ${config.PORT}`);
  });
}
