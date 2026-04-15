import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Job } from "../../job/job.entity";

@Entity({ name: "skills" })
export class Skill {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id!: number;

  @Index("uq_skills_name", { unique: true })
  @Column({ type: "text", name: "name" })
  name!: string;

  @ManyToMany(() => Job, job => job.skills)
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
  jobs!: Job[];

  @ManyToMany(() => User, user => user.skills)
  @JoinTable({
    name: "user_skills",
    joinColumn: {
      name: "user_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "skill_id",
      referencedColumnName: "id",
    },
  })
  users!: User[];
}
