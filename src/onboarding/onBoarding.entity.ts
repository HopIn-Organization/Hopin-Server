import {
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

  @ManyToOne(() => Project, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @RelationId((onboarding: OnBoarding) => onboarding.project)
  projectId!: number;

  @OneToMany(() => Task, task => task.onboarding)
  tasks!: Task[];
}
