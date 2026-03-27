import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { Skill } from './skill.entity';

@Entity({ name: 'jobs' })
export class Job {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'title' })
  title!: string;

  @ManyToOne(() => Project, (project) => project.jobs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project!: Project | null;

  @ManyToMany(() => Skill, (skill) => skill.jobs)
  skills!: Skill[];
}
