import { DocumentRepository } from "./document.repository";
import { S3Service } from "./s3.service";
import { ProjectDocument } from "./document.entity";
import crypto from "crypto";

const MAX_FILES_PER_PROJECT = 10;
const MAX_FILES_PER_JOB = 10;

const ALLOWED_MIME_TYPES = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/pdf",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export class DocumentService {
    private documentRepository: DocumentRepository;
    private s3Service: S3Service;

    constructor() {
        this.documentRepository = new DocumentRepository();
        this.s3Service = new S3Service();
    }

    async getDocumentsByProject(projectId: number): Promise<ProjectDocument[]> {
        return this.documentRepository.findByProjectId(projectId);
    }

    async getDocumentsByJob(projectId: number, jobId: number): Promise<ProjectDocument[]> {
        return this.documentRepository.findByJobId(projectId, jobId);
    }

    async uploadDocuments(
        projectId: number,
        files: Express.Multer.File[],
        jobId?: number,
    ): Promise<ProjectDocument[]> {
        if (jobId) {
            const currentCount = await this.documentRepository.countByJobId(projectId, jobId);
            if (currentCount + files.length > MAX_FILES_PER_JOB) {
                throw new Error(
                    `Cannot upload. A job can have at most ${MAX_FILES_PER_JOB} documents. Currently has ${currentCount}.`,
                );
            }
        } else {
            const currentCount = await this.documentRepository.countByProjectId(projectId);
            if (currentCount + files.length > MAX_FILES_PER_PROJECT) {
                throw new Error(
                    `Cannot upload. A project can have at most ${MAX_FILES_PER_PROJECT} documents. Currently has ${currentCount}.`,
                );
            }
        }

        for (const file of files) {
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                throw new Error(
                    `File "${file.originalname}" has unsupported type "${file.mimetype}". Only text-based documents are allowed.`,
                );
            }
        }

        const uploaded: ProjectDocument[] = [];

        for (const file of files) {
            const uniqueId = crypto.randomUUID();
            const pathPrefix = jobId
                ? `projects/${projectId}/jobs/${jobId}/documents`
                : `projects/${projectId}/documents`;
            const s3Key = `${pathPrefix}/${uniqueId}/${file.originalname}`;

            await this.s3Service.upload(s3Key, file.buffer, file.mimetype);

            const doc = await this.documentRepository.create({
                originalName: file.originalname,
                s3Key,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                projectId,
                jobId: jobId ?? null,
            });

            uploaded.push(doc);
        }

        return uploaded;
    }

    async deleteDocument(documentId: number, projectId: number): Promise<void> {
        const doc = await this.documentRepository.findById(documentId);

        if (!doc) {
            throw new Error("Document not found");
        }

        if (doc.projectId !== projectId) {
            throw new Error("Document does not belong to this project");
        }

        await this.s3Service.delete(doc.s3Key);
        await this.documentRepository.delete(documentId);
    }

    async getDownloadUrl(documentId: number, projectId: number): Promise<string> {
        const doc = await this.documentRepository.findById(documentId);

        if (!doc) {
            throw new Error("Document not found");
        }

        if (doc.projectId !== projectId) {
            throw new Error("Document does not belong to this project");
        }

        return this.s3Service.getSignedDownloadUrl(doc.s3Key);
    }
}
