import { DocumentRepository } from "./document.repository";
import { S3Service } from "./s3.service";
import { DocumentExtractionService } from "./document-extraction.service";
import { ExtractionStatus, ProjectDocument } from "./document.entity";
import { DocumentChunkRepository } from "./document-chunk.repository";
import { PineconeService } from "./pinecone.service";
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

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class DocumentService {
    private documentRepository: DocumentRepository;
    private s3Service: S3Service;
    private extractionService: DocumentExtractionService;
    private documentChunkRepository: DocumentChunkRepository;
    private pineconeService: PineconeService;

    constructor() {
        this.documentRepository = new DocumentRepository();
        this.s3Service = new S3Service();
        this.extractionService = new DocumentExtractionService(
            this.documentRepository,
            this.s3Service,
        );
        this.documentChunkRepository = new DocumentChunkRepository();
        this.pineconeService = new PineconeService();
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

            void this.extractionService.extractAndStore(doc);

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

        const chunks = await this.documentChunkRepository.findByDocumentId(documentId);
        const vectorIds = chunks.map((c) => `chunk-${c.documentId}-${c.chunkIndex}`);
        await this.pineconeService.deleteChunksByDocumentId(vectorIds, doc.projectId);

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

    async getExtractedTextsForJob(
        projectId: number,
        jobId: number,
    ): Promise<{ texts: string[]; pendingCount: number; failedCount: number }> {
        const docs = await this.documentRepository.findByJobId(projectId, jobId);
        const texts = docs
            .filter((doc) => doc.extractionStatus === ("done" as ExtractionStatus) && doc.extractedText !== null)
            .map((doc) => doc.extractedText as string);
        const pendingCount = docs.filter(
            (doc) =>
                doc.extractionStatus === ("pending" as ExtractionStatus) ||
                doc.extractionStatus === ("processing" as ExtractionStatus),
        ).length;
        const failedCount = docs.filter(
            (doc) => doc.extractionStatus === ("failed" as ExtractionStatus),
        ).length;
        return { texts, pendingCount, failedCount };
    }

    async getRelevantChunksForJob(
        projectId: number,
        jobId: number,
        queryEmbedding: number[],
        topK: number = 5,
    ): Promise<{ text: string; score: number; sourceFileName: string }[]> {
        // Try Pinecone first
        if (!this.pineconeService.isDisabled()) {
            const results = await this.pineconeService.queryChunks(queryEmbedding, projectId, jobId, topK);
            if (results.length > 0) {
                return results.map((r) => ({ text: r.text, score: r.score, sourceFileName: r.sourceFileName }));
            }
            console.warn('[Pinecone] No results returned — falling back to Postgres cosine similarity');
        }

        // Fallback: Postgres cosine similarity
        const allChunks = await this.documentChunkRepository.findByJobId(projectId, jobId);
        if (allChunks.length === 0) return [];

        return allChunks
            .map((chunk) => ({
                text: chunk.text,
                score: cosineSimilarity(queryEmbedding, chunk.embedding),
                sourceFileName: chunk.sourceFileName,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
}
