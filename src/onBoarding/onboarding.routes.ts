import { Router } from "express";
import { onboardingController } from "./onboarding.controller";

const router = Router();

router.get("/:userId");
router.post("/generate", onboardingController.generateOnboarding);

export default router;
