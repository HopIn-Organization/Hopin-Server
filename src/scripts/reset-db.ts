import * as dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Job } from '../job/job.entity';
import { Project } from '../project/project.entity';
import { ProjectMember } from '../projectMember/projectMember.entity';
import { Skill } from '../skill/skill.entity';
import { OnBoarding } from '../onboarding/onBoarding.entity';
import { Task } from '../task/task.entity';
import { runSeed } from './seed';

const ResetDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  entities: [User, Job, Project, ProjectMember, Skill, OnBoarding, Task],
  migrations: [path.join(__dirname, '../database/migrations/*.{ts,js}')],
});

async function resetDb() {
  await ResetDataSource.initialize();

  const queryRunner = ResetDataSource.createQueryRunner();
  await queryRunner.query('DROP SCHEMA public CASCADE');
  await queryRunner.query('CREATE SCHEMA public');
  await queryRunner.query('GRANT ALL ON SCHEMA public TO public');
  await queryRunner.release();

  await ResetDataSource.runMigrations();
  console.log('All migrations applied.');

  await runSeed(ResetDataSource);

  await ResetDataSource.destroy();
}

resetDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
