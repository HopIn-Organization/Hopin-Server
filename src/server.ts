import 'reflect-metadata';

const _originalEmit = process.emit.bind(process);
(process.emit as (...args: unknown[]) => boolean) = function (
  event: unknown,
  ...args: unknown[]
) {
  if (event === 'warning') {
    const warning = args[0] as { name?: string; message?: string };
    if (
      warning?.name === 'DeprecationWarning' &&
      warning?.message?.includes('client.query()')
    ) {
      return false;
    }
  }
  return _originalEmit(event as string, ...args);
};

import app from './app';
import { initializeDatabase } from './database';
import { shutdownLangfuse } from './utils/langfuse';
import { S3Service } from './document/s3.service';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initializeDatabase();

    const s3Service = new S3Service();
    await s3Service.ensureBucketExists();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);

    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  try {
    await shutdownLangfuse();
  } catch (error) {
    console.error(`Failed to flush Langfuse traces on ${signal}:`, error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

startServer();
