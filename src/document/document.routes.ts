import { Router } from "express";
import multer from "multer";
import { DocumentController } from "./document.controller";

const router = Router();
const documentController = new DocumentController();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 10,
    },
});

// GET /projects/:projectId/documents
router.get("/:projectId/documents", documentController.getDocuments);

// POST /projects/:projectId/documents
router.post(
    "/:projectId/documents",
    upload.array("files", 10),
    documentController.uploadDocuments,
);

// DELETE /projects/:projectId/documents/:documentId
router.delete("/:projectId/documents/:documentId", documentController.deleteDocument);

// GET /projects/:projectId/documents/:documentId/download
router.get("/:projectId/documents/:documentId/download", documentController.getDownloadUrl);

// GET /projects/:projectId/jobs/:jobId/documents
router.get("/:projectId/jobs/:jobId/documents", documentController.getJobDocuments);

// POST /projects/:projectId/jobs/:jobId/documents
router.post(
    "/:projectId/jobs/:jobId/documents",
    upload.array("files", 10),
    documentController.uploadJobDocuments,
);

// DELETE /projects/:projectId/jobs/:jobId/documents/:documentId (reuses same delete logic)
router.delete("/:projectId/jobs/:jobId/documents/:documentId", documentController.deleteDocument);

export default router;
