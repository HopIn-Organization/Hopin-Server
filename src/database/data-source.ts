import 'reflect-metadata';
import path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './entities/user.entity';
import { Job } from '../job/job.entity';
import { Project } from '../project/project.entity';
import { ProjectMember } from '../projectMember/projectMember.entity';
import { Skill } from '../skill/skill.entity';
import { OnBoarding } from '../onBoarding/onBoarding.entity';
import { Task } from '../task/task.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [User, Job, Project, ProjectMember, Skill, OnBoarding, Task],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [path.join(__dirname, 'subscribers', '*.{ts,js}')],
});
