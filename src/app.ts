import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import indexRouter from './routes/index';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', indexRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
