import 'reflect-metadata';
import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { QueryFailedError } from 'typeorm';
import indexRouter from './routes/index';
import { langfuseMiddleware } from './utils/langfuse';

const app: Application = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

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

  const trace = (req as any).langfuseTrace;
  if (trace) {
    trace.update({
      metadata: {
        error: err.message,
        status: 'error',
      },
    });
  }

  if (err instanceof QueryFailedError) {
    res.status(422).json({ error: `Database error: ${err.message}` });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;