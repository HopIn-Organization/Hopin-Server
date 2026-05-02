import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
} from "typeorm";
import { User } from "../database/entities/user.entity";
import { Task } from "../task/task.entity";
import { Job } from "../job/job.entity";
import { Project } from "../project/project.entity";
import { OnboardingStatus } from "./onboarding.types";

@Entity({ name: "onboarding" })
export class OnBoarding {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @RelationId((onboarding: OnBoarding) => onboarding.user)
  userId!: number;

  @ManyToOne(() => Job, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "job_id" })
  job!: Job;

  @RelationId((onboarding: OnBoarding) => onboarding.job)
  jobId!: number;

    // TODO: remove the project relation from OnBoarding entirely — project is already
  // reachable via job (onboarding → job → project), so storing it here is redundant
  // and risks getting out of sync. Queries that filter or join by project should go
  // through the job relation instead.
  @ManyToOne(() => Project, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @RelationId((onboarding: OnBoarding) => onboarding.project)
  projectId!: number;

  @Column({ type: 'varchar', default: 'pending' })
  status!: OnboardingStatus;

  @Column({ type: 'text', nullable: true, default: null })
  failureReason!: string | null;

  @OneToMany(() => Task, task => task.onboarding)
  tasks!: Task[];
}
