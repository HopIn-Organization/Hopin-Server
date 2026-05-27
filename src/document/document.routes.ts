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

router.get("/:projectId/documents", documentController.getDocuments);
router.post(
    "/:projectId/documents",
    upload.array("files", 10),
    documentController.uploadDocuments,
);
router.delete("/:projectId/documents/:documentId", documentController.deleteDocument);
router.get("/:projectId/documents/:documentId/download", documentController.getDownloadUrl);
router.get("/:projectId/jobs/:jobId/documents", documentController.getJobDocuments);
router.post(
    "/:projectId/jobs/:jobId/documents",
    upload.array("files", 10),
    documentController.uploadJobDocuments,
);
router.delete("/:projectId/jobs/:jobId/documents/:documentId", documentController.deleteDocument);

export default router;
