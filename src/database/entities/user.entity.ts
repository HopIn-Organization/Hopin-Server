import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Skill } from './skill.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'email', nullable: true, unique: true })
  email!: string | null;

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
}
