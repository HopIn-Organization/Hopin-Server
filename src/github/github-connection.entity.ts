import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Project } from '../project/project.entity';

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
  REVOKED = 'revoked',
}

@Entity({ name: 'github_connections' })
@Index(['project', 'repoId'], { unique: true })
export class GithubConnection {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @ManyToOne(() => Project, project => project.githubConnections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @RelationId((gc: GithubConnection) => gc.project)
  project_id!: number;

  // Not a secret — useless without the App private key, which never touches the DB
  @Column({ type: 'text', name: 'installation_id' })
  installationId!: string;

  @Column({ type: 'text', name: 'repo_owner' })
  repoOwner!: string;

  @Column({ type: 'text', name: 'repo_name' })
  repoName!: string;

  @Column({ type: 'text', name: 'repo_id' })
  repoId!: string;

  @Column({ type: 'boolean', name: 'is_private', default: false })
  isPrivate!: boolean;

  @Column({ type: 'text', name: 'default_branch' })
  defaultBranch!: string;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    name: 'sync_status',
    default: SyncStatus.PENDING,
  })
  syncStatus!: SyncStatus;

  @Column({ type: 'timestamp', name: 'last_synced_at', nullable: true })
  lastSyncedAt!: Date | null;

  @Column({ type: 'text', name: 'last_commit_sha', nullable: true })
  lastCommitSha!: string | null;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'connected_at' })
  connectedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
