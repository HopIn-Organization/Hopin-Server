import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectMember } from '../../projectMember/projectMember.entity';
import { Skill } from '../../skill/skill.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'email', unique: true })
  email!: string;

  @Column({ type: 'text', name: 'password_hash', nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ type: 'text', name: 'refresh_token_hash', nullable: true, select: false })
  refreshTokenHash!: string | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'refresh_token_expires_at',
    nullable: true,
    select: false,
  })
  refreshTokenExpiresAt!: Date | null;

  @Column({ type: 'integer', name: 'experience_years', nullable: true })
  experienceYears!: number | null;

  @ManyToMany(() => Skill, (skill) => skill.users)
  skills!: Skill[];

  @OneToMany(() => ProjectMember, (membership) => membership.user)
  projectMemberships!: ProjectMember[];
}
