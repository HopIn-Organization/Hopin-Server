import { Router } from "express";
import { generateOnboarding } from "./onboarding.controller";

const router = Router();

router.get("/:userId");
// POST /onboarding/generate
// Body: { userId: number, jobId: number, documents?: string[] }
router.post("/generate", generateOnboarding);

export default router;
