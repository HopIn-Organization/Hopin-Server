import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from './job.entity';
import { ProjectUser } from './project-user.entity';

@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description!: string | null;

  @OneToMany(() => Job, (job) => job.project)
  jobs!: Job[];

  @OneToMany(() => ProjectUser, (projectUser) => projectUser.project)
  projectUsers!: ProjectUser[];
}
