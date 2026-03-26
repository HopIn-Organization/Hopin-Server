import { AppDataSource } from './data-source';

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};

export { AppDataSource };
