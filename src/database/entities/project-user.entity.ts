import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum ProjectRole {
  ADMIN = 'admin',
  TRAINEE = 'trainee',
}

@Entity({ name: 'project_users' })
export class ProjectUser {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'integer', name: 'project_id' })
  projectId!: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId!: number;

  @Column({ type: 'text', name: 'role', default: ProjectRole.TRAINEE })
  role!: ProjectRole;

  @ManyToOne(() => Project, (project) => project.projectUsers)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, (user) => user.projectUsers)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
