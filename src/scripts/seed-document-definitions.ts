import fs from "fs";
import path from "path";

const MOCK_DIR = path.join(__dirname, "mock-documents");

function loadFile(filename: string): Buffer {
  return fs.readFileSync(path.join(MOCK_DIR, filename));
}

// Named indices matching the order projects/jobs are saved in seed.ts.
// Update here if you add or reorder projects/jobs there.
export const PROJECT = {
  ECOMMERCE: 0,
  TASK_MANAGEMENT: 1,
  ANALYTICS: 2,
} as const;

export const JOB = {
  FRONTEND_DEVELOPER: 0,
  BACKEND_DEVELOPER: 1,
  FULLSTACK_DEVELOPER: 2,
  DATA_ENGINEER: 3,
  DEVOPS_ENGINEER: 4,
} as const;

export interface SeedDocumentDef {
  originalName: string;
  s3Key: string;
  mimeType: string;
  content: Buffer;
  projectIndex: number;
  jobIndex: number | null;
}

export const SEED_DOCUMENTS: SeedDocumentDef[] = [
  // --- Project-level documents ---
  {
    originalName: "ecommerce-project-brief.pdf",
    s3Key: "seed/projects/ecommerce/ecommerce-project-brief.pdf",
    mimeType: "application/pdf",
    content: loadFile("ecommerce-project-brief.txt"),
    projectIndex: PROJECT.ECOMMERCE,
    jobIndex: null,
  },
  {
    originalName: "ecommerce-architecture.md",
    s3Key: "seed/projects/ecommerce/ecommerce-architecture.md",
    mimeType: "text/markdown",
    content: loadFile("ecommerce-architecture.md"),
    projectIndex: PROJECT.ECOMMERCE,
    jobIndex: null,
  },
  {
    originalName: "task-management-requirements.pdf",
    s3Key: "seed/projects/task-management/task-management-requirements.pdf",
    mimeType: "application/pdf",
    content: loadFile("task-management-requirements.txt"),
    projectIndex: PROJECT.TASK_MANAGEMENT,
    jobIndex: null,
  },
  {
    originalName: "analytics-dashboard-overview.pdf",
    s3Key: "seed/projects/analytics/analytics-dashboard-overview.pdf",
    mimeType: "application/pdf",
    content: loadFile("analytics-dashboard-overview.txt"),
    projectIndex: PROJECT.ANALYTICS,
    jobIndex: null,
  },
  // --- Job-level documents ---
  {
    originalName: "frontend-developer-role-guide.pdf",
    s3Key: "seed/projects/ecommerce/jobs/frontend-developer-role-guide.pdf",
    mimeType: "application/pdf",
    content: loadFile("frontend-developer-role-guide.txt"),
    projectIndex: PROJECT.ECOMMERCE,
    jobIndex: JOB.FRONTEND_DEVELOPER,
  },
  {
    originalName: "backend-developer-role-guide.pdf",
    s3Key: "seed/projects/ecommerce/jobs/backend-developer-role-guide.pdf",
    mimeType: "application/pdf",
    content: loadFile("backend-developer-role-guide.txt"),
    projectIndex: PROJECT.ECOMMERCE,
    jobIndex: JOB.BACKEND_DEVELOPER,
  },
  {
    originalName: "fullstack-developer-role-guide.pdf",
    s3Key: "seed/projects/task-management/jobs/fullstack-developer-role-guide.pdf",
    mimeType: "application/pdf",
    content: loadFile("fullstack-developer-role-guide.txt"),
    projectIndex: PROJECT.TASK_MANAGEMENT,
    jobIndex: JOB.FULLSTACK_DEVELOPER,
  },
  {
    originalName: "data-engineer-role-guide.pdf",
    s3Key: "seed/projects/analytics/jobs/data-engineer-role-guide.pdf",
    mimeType: "application/pdf",
    content: loadFile("data-engineer-role-guide.txt"),
    projectIndex: PROJECT.ANALYTICS,
    jobIndex: JOB.DATA_ENGINEER,
  },
  {
    originalName: "devops-engineer-role-guide.pdf",
    s3Key: "seed/projects/analytics/jobs/devops-engineer-role-guide.pdf",
    mimeType: "application/pdf",
    content: loadFile("devops-engineer-role-guide.txt"),
    projectIndex: PROJECT.ANALYTICS,
    jobIndex: JOB.DEVOPS_ENGINEER,
  },
];
