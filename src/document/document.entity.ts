import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    JoinColumn,
} from "typeorm";
import { Project } from "../project/project.entity";
import { Job } from "../job/job.entity";

@Entity({ name: "project_documents" })
export class ProjectDocument {
    @PrimaryGeneratedColumn({ type: "integer", name: "id" })
    id!: number;

    @Column({ type: "text", name: "original_name" })
    originalName!: string;

    @Column({ type: "text", name: "s3_key" })
    s3Key!: string;

    @Column({ type: "text", name: "mime_type" })
    mimeType!: string;

    @Column({ type: "integer", name: "size_bytes" })
    sizeBytes!: number;

    @ManyToOne(() => Project, { onDelete: "CASCADE" })
    @JoinColumn({ name: "project_id" })
    project!: Project;

    @Column({ type: "integer", name: "project_id" })
    projectId!: number;

    @ManyToOne(() => Job, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "job_id" })
    job!: Job | null;

    @Column({ type: "integer", name: "job_id", nullable: true })
    jobId!: number | null;

    @CreateDateColumn({ name: "uploaded_at" })
    uploadedAt!: Date;
}
