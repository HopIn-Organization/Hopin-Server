import 'reflect-metadata';
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
