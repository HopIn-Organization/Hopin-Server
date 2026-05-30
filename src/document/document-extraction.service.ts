import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { ExtractionStatus, ProjectDocument } from "./document.entity";
import { DocumentRepository } from "./document.repository";
import { S3Service } from "./s3.service";

const TEXT_MIME_TYPES = new Set([
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
]);

const WORD_MIME_TYPES = new Set([
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function normalizeText(raw: string): string {
    return raw
        .replace(/^\uFEFF/, "")           // strip BOM
        .replace(/\0/g, "")               // remove null bytes
        .replace(/(\r\n|\r)/g, "\n")      // normalize line endings
        .replace(/\n{3,}/g, "\n\n")       // collapse multiple blank lines
        .trim();
}

export class DocumentExtractionService {
    private documentRepository: DocumentRepository;
    private s3Service: S3Service;

    constructor(documentRepository: DocumentRepository, s3Service: S3Service) {
        this.documentRepository = documentRepository;
        this.s3Service = s3Service;
    }

    private async extractText(doc: ProjectDocument): Promise<string> {
        const buffer = await this.s3Service.getObjectBuffer(doc.s3Key);
        const mime = doc.mimeType;

        if (TEXT_MIME_TYPES.has(mime)) {
            return normalizeText(buffer.toString("utf-8"));
        }

        if (mime === "application/pdf") {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            return normalizeText(result.text);
        }

        if (WORD_MIME_TYPES.has(mime)) {
            const result = await mammoth.extractRawText({ buffer });
            return normalizeText(result.value);
        }

        throw new Error(`Unsupported MIME type: ${mime}`);
    }

    async extractAndStore(doc: ProjectDocument): Promise<void> {
        try {
            await this.documentRepository.update(doc.id, {
                extractionStatus: "processing" as ExtractionStatus,
            });

            const text = await this.extractText(doc);

            await this.documentRepository.update(doc.id, {
                extractedText: text,
                extractionStatus: "done" as ExtractionStatus,
            });
        } catch (err) {
            console.error(
                `[DocumentExtractionService] Failed to extract text for document ${doc.id}:`,
                err,
            );
            await this.documentRepository
                .update(doc.id, { extractionStatus: "failed" as ExtractionStatus })
                .catch(() => {});
        }
    }
}
