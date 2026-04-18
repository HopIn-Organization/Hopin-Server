import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Project } from "./../project/project.entity";
import { Skill } from "../database/entities/skill.entity";

@Entity({ name: "jobs" })
export class Job {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id!: number;

  @Column({ type: "text", name: "title" })
  title!: string;

  @ManyToOne(() => Project, project => project.jobs, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "project_id" })
  project!: Project | null;

  @ManyToMany(() => Skill, skill => skill.jobs)
  @JoinTable({
    name: "job_skills",
    joinColumn: {
      name: "job_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "skill_id",
      referencedColumnName: "id",
    },
  })
  skills!: Skill[];
}
