import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectDocument } from './document.entity';

@Entity({ name: 'document_chunks' })
export class DocumentChunk {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'integer', name: 'document_id' })
  documentId!: number;

  @ManyToOne(() => ProjectDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: ProjectDocument;

  @Column({ type: 'integer', name: 'project_id' })
  projectId!: number;

  @Column({ type: 'integer', name: 'job_id', nullable: true })
  jobId!: number | null;

  @Column({ type: 'integer', name: 'chunk_index' })
  chunkIndex!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', name: 'source_file_name' })
  sourceFileName!: string;

  @Column({ type: 'real', array: true, name: 'embedding' })
  embedding!: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
