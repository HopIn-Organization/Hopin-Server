import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from 'typeorm';
import { OnBoarding } from '../onboarding/onBoarding.entity';

@Entity({ name: 'task' })
export class Task {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ type: 'int', name: 'order' })
  order!: number;

  @ManyToOne(() => OnBoarding, (onboarding) => onboarding.tasks)
  @JoinColumn({ name: 'onboarding_id' })
  onboarding?: OnBoarding;

  @Column({ type: 'text', name: 'title' })
  title!: string;

  @Column({ type: 'text', name: 'description' })
  description!: string;

  @Column({ type: 'float', name: 'estimated_days' })
  estimatedDays!: number;

  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted!: boolean;

  @Column({ type: 'text', array: true, name: 'links', nullable: true, default: '{}' })
  links!: string[];

  @ManyToOne(() => Task, (task) => task.subtasks, { nullable: true })
  parent?: Task;

  @OneToMany(() => Task, (task) => task.parent)
  subtasks!: Task[];
}
