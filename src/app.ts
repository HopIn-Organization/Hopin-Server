import 'reflect-metadata';
import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { QueryFailedError } from 'typeorm';
import indexRouter from './routes/index';
import { langfuseMiddleware } from './utils/langfuse';
import { githubWebhookController } from './github/webhook';

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Webhook must be registered BEFORE express.json() so it receives the raw Buffer
// needed for HMAC-SHA256 signature verification.
app.post(
  '/webhooks/github',
  express.raw({ type: 'application/json' }),
  githubWebhookController.handle
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(langfuseMiddleware);

app.use('/', indexRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  const trace = req.langfuseTrace;
  if (trace) {
    trace.update({
      level: 'ERROR',
      statusMessage: err.message,
      metadata: {
        error: err.message,
        status: 'error',
      },
    });
  }

  if (err instanceof QueryFailedError) {
    res.status(422).json({ message: 'Invalid request data.' });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
