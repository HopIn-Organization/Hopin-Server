export type OnboardingStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface OnboardingStatusResponse {
  id: number;
  status: OnboardingStatus;
  failureReason: string | null;
}

// Describes how an onboarding plan was sourced from GitHub repo knowledge:
//   'used'  – at least one repo summary was successfully pulled from S3
//   'none'  – no synced GitHub connections were available for the project
//   'error' – connections existed but their summaries could not be read
export type RepoKnowledgeStatus = 'used' | 'none' | 'error';

export interface RepoKnowledgeRepoRef {
  connectionId: number;
  repoOwner: string;
  repoName: string;
  repoUrl: string; // https://github.com/{owner}/{name}
  commitSha: string;
}

// Captures the knowledge sources that fed an onboarding's generation. Today it only
// records GitHub repo knowledge, but this is intentionally named generically: in the
// future it may also hold the documents, job skills, or anything else used to generate
// the plan.
export interface KnowledgeMeta {
  status: RepoKnowledgeStatus;
  repos: RepoKnowledgeRepoRef[];
}
