import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Skill } from './skill.entity';
import { ProjectUser } from './project-user.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'integer', name: 'experience_years', nullable: true })
  experienceYears!: number | null;

  @ManyToMany(() => Skill, (skill) => skill.users)
  skills!: Skill[];

  @OneToMany(() => ProjectUser, (pu) => pu.user)
  projectUsers!: ProjectUser[];
}
