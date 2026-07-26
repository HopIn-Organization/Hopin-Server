import { AppDataSource } from './data-source';
import {
  GithubConnection,
  SyncStatus,
} from '../github/github-connection.entity';

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    // Any row left in SYNCING means the previous process was killed mid-sync.
    // Reset them to ERROR so they are not stuck forever.
    await AppDataSource.getRepository(GithubConnection).update(
      { syncStatus: SyncStatus.SYNCING },
      {
        syncStatus: SyncStatus.ERROR,
        lastError: 'Sync interrupted by server restart',
      }
    );
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};

export { AppDataSource };
