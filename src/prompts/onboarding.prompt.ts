const DEFAULT_COMPANY_DOCUMENT = `
Company Onboarding Guidelines:
- All new employees should familiarize themselves with the company's coding standards and version control workflow (Git branching strategy, PR reviews).
- Engineers are expected to set up their local development environment within the first day.
- Each new employee should read through existing technical documentation and architecture diagrams.
- Code reviews are mandatory for every pull request; at least one approval is required before merging.
- New employees should schedule introductory meetings with their team lead and at least two other team members during their first week.
- Security practices: never commit secrets or credentials, always use environment variables.
- Employees are encouraged to ask questions early and often — the team values open communication.
`.trim();

export interface OnboardingPromptInput {
  onboardingId: number;
  userName: string;
  userExperienceYears: number | null;
  userSkills: string[];
  jobTitle: string;
  jobRequiredSkills: string[];
  projectName: string;
  projectDescription: string | null;
  documents: string[];
}

export function buildOnboardingPrompt(input: OnboardingPromptInput): string {
  const {
    onboardingId,
    userName,
    userExperienceYears,
    userSkills,
    jobTitle,
    jobRequiredSkills,
    projectName,
    projectDescription,
    documents,
  } = input;

  const experienceLabel =
    userExperienceYears === null || userExperienceYears === 0
      ? 'no prior professional experience'
      : `${userExperienceYears} year${userExperienceYears === 1 ? '' : 's'} of professional experience`;

  const userSkillsLabel =
    userSkills.length > 0 ? userSkills.join(', ') : 'none listed';

  const jobSkillsLabel =
    jobRequiredSkills.length > 0
      ? jobRequiredSkills.join(', ')
      : 'no specific skills listed';

  const projectDescriptionLabel =
    projectDescription ?? 'No description provided.';

  const documentSection =
    documents.length > 0
      ? documents
          .map((doc, i) => `--- Document ${i + 1} ---\n${doc}`)
          .join('\n\n')
      : `--- Default Company Guidelines ---\n${DEFAULT_COMPANY_DOCUMENT}`;

  return `
You are an expert onboarding manager for a software company. Your job is to create a personalized, sequenced onboarding task board for a new employee.

Use all the information provided below to generate a realistic, practical, and tailored onboarding plan.

## Onboarding Record
- Onboarding ID: ${onboardingId}

## New Employee Profile
- Name: ${userName}
- Experience: ${experienceLabel}
- Skills they already have: ${userSkillsLabel}

## Job Role
- Title: ${jobTitle}
- Required skills for this role: ${jobSkillsLabel}

## Project Context
- Project name: ${projectName}
- Project description: ${projectDescriptionLabel}

## Company Documents
The following documents contain important context about the company, the project, and onboarding expectations. Use them to ground your tasks in real, relevant content.

${documentSection}

## Instructions
Generate a sequenced onboarding task board tailored to this specific employee and role.

Rules:
- Tasks must be ordered logically (setup before coding, reading before building, etc.)
- Tailor the depth of tasks to the employee's experience level — more experienced employees need fewer basic tasks
- Focus on skill gaps: if the employee lacks a required skill, include tasks to address it
- Each task must be concrete and actionable, not vague
- Aim for 6 to 12 tasks total
- estimatedDays should reflect realistic effort (1–5 days per task)

Respond ONLY with a valid JSON array of Task entity objects in this exact format, no explanation or markdown:
[
  {
    "order": 1,
    "title": "Short task title",
    "description": "Detailed description of what the employee should do and why it matters for their onboarding.",
    "estimatedDays": 1,
    "isCompleted": false,
    "onboardingId": ${onboardingId},
    "parent": null,
    "subtasks": []
  }
]
`.trim();
}
