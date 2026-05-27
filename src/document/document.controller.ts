import { Request, Response } from "express";
import { DocumentService } from "./document.service";

interface ProjectParams extends Record<string, string> {
    projectId: string;
}

interface DocumentParams extends ProjectParams {
    documentId: string;
}

interface JobDocumentParams extends ProjectParams {
    jobId: string;
}

interface JobDocumentDeleteParams extends JobDocumentParams {
    documentId: string;
}

export class DocumentController {
    private documentService: DocumentService;

    constructor() {
        this.documentService = new DocumentService();
    }

    getDocuments = async (req: Request<ProjectParams>, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId);
            const documents = await this.documentService.getDocumentsByProject(projectId);
            res.json(documents);
        } catch (error: any) {
            res.status(500).json({ message: "Error fetching documents" });
        }
    };

    getJobDocuments = async (req: Request<JobDocumentParams>, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId);
            const jobId = parseInt(req.params.jobId);
            const documents = await this.documentService.getDocumentsByJob(projectId, jobId);
            res.json(documents);
        } catch (error: any) {
            res.status(500).json({ message: "Error fetching job documents" });
        }
    };

    uploadDocuments = async (req: Request<ProjectParams>, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId);
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({ message: "No files provided" });
                return;
            }

            const documents = await this.documentService.uploadDocuments(projectId, files);
            res.status(201).json(documents);
        } catch (error: any) {
            if (error.message.includes("Cannot upload") || error.message.includes("unsupported type")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Error uploading documents" });
            }
        }
    };

    uploadJobDocuments = async (req: Request<JobDocumentParams>, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId);
            const jobId = parseInt(req.params.jobId);
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({ message: "No files provided" });
                return;
            }

            const documents = await this.documentService.uploadDocuments(projectId, files, jobId);
            res.status(201).json(documents);
        } catch (error: any) {
            if (error.message.includes("Cannot upload") || error.message.includes("unsupported type")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Error uploading job documents" });
            }
        }
    };

    deleteDocument = async (req: Request<DocumentParams>, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId);
            const documentId = parseInt(req.params.documentId);

            await this.documentService.deleteDocument(documentId, projectId);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === "Document not found") {
                res.status(404).json({ message: error.message });
            } else if (error.message.includes("does not belong")) {
                res.status(403).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Error deleting document" });
            }
        }
    };

    getDownloadUrl = async (req: Request<DocumentParams>, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId);
            const documentId = parseInt(req.params.documentId);

            const url = await this.documentService.getDownloadUrl(documentId, projectId);
            res.json({ url });
        } catch (error: any) {
            if (error.message === "Document not found") {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Error generating download URL" });
            }
        }
    };
}
