import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Job } from '../database/entities/job.entity';
import { User } from '../database/entities/user.entity';
import { Project } from '../database/entities/project.entity';
import { Task } from '../task/task.entity';

@Entity({ name: 'onboarding' })
export class Onboarding {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @RelationId((onboarding: Onboarding) => onboarding.user)
  userId!: number;

  @ManyToOne(() => Job, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  @RelationId((onboarding: Onboarding) => onboarding.job)
  jobId!: number;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @RelationId((onboarding: Onboarding) => onboarding.project)
  projectId!: number;

  @OneToMany(() => Task, (task) => task.onboarding)
  tasks!: Task[];
}