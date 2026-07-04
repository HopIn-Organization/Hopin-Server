import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from '../job/job.entity';
import { ProjectMember } from '../projectMember/projectMember.entity';
import { GithubConnection } from '../github/github-connection.entity';

@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description!: string | null;

  @OneToMany(() => Job, job => job.project)
  jobs!: Job[];

  @OneToMany(() => ProjectMember, membership => membership.project)
  members!: ProjectMember[];

  @OneToOne(() => GithubConnection, githubConnection => githubConnection.project, { nullable: true, eager: false })
  githubConnection!: GithubConnection | null;
}
