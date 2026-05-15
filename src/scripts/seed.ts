import "reflect-metadata";
import bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { User } from "../database/entities/user.entity";
import { Job } from "../job/job.entity";
import { OnBoarding } from "../onboarding/onBoarding.entity";
import { Project } from "../project/project.entity";
import { ProjectMember, ProjectRole } from "../projectMember/projectMember.entity";
import { Skill } from "../skill/skill.entity";
import { Task } from "../task/task.entity";

export async function runSeed(dataSource?: DataSource): Promise<void> {
  const ownConnection = !dataSource;
  const ds = dataSource ?? AppDataSource;
  if (ownConnection) await ds.initialize();
  try {
    await _seed(ds);
  } finally {
    if (ownConnection) await ds.destroy();
  }
}

async function _seed(dataSource: DataSource): Promise<void> {
  const skillsData = [
    "JavaScript", "TypeScript", "Node.js", "React",
    "Python", "SQL", "Docker", "AWS",
  ];

  const skillRepo = dataSource.getRepository(Skill);
  const skills: Skill[] = [];
  for (const name of skillsData) {
    let skill = await skillRepo.findOne({ where: { name } });
    if (!skill) {
      skill = await skillRepo.save(skillRepo.create({ name }));
    }
    skills.push(skill);
  }

  const projectRepo = dataSource.getRepository(Project);
  const projects = await projectRepo.save([
    { name: "E-commerce Platform", description: "A full-stack e-commerce application" },
    { name: "Task Management App", description: "A collaborative task management tool" },
    { name: "Data Analytics Dashboard", description: "Real-time data visualization platform" },
  ]);

  const jobRepo = dataSource.getRepository(Job);
  const jobs = await jobRepo.save([
    { title: "Frontend Developer", project: projects[0] },
    { title: "Backend Developer", project: projects[0] },
    { title: "Full Stack Developer", project: projects[1] },
    { title: "Data Engineer", project: projects[2] },
    { title: "DevOps Engineer", project: projects[2] },
  ]);

  const jobSkillsAssignments = [[0, 1, 3], [0, 1, 2], [0, 1, 2, 3], [4, 5], [6, 7]];
  for (let i = 0; i < jobs.length; i++) {
    jobs[i].skills = jobSkillsAssignments[i].map((idx) => skills[idx]);
    await jobRepo.save(jobs[i]);
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  const userRepo = dataSource.getRepository(User);
  const users = await userRepo.save([
    {
      name: "Alice Johnson", email: "alice@example.com", passwordHash,
      birthDate: "1992-03-15",
      workExperience: [
        { id: "we-1", title: "Frontend Developer", years: 3 },
        { id: "we-2", title: "React Engineer", years: 2 },
      ],
    },
    {
      name: "Bob Smith", email: "bob@example.com", passwordHash,
      birthDate: "1995-07-22",
      workExperience: [
        { id: "we-3", title: "Backend Developer", years: 3 },
      ],
    },
    {
      name: "Charlie Brown", email: "charlie@example.com", passwordHash,
      birthDate: "1988-11-05",
      workExperience: [
        { id: "we-4", title: "Full Stack Developer", years: 5 },
        { id: "we-5", title: "Senior Engineer", years: 2 },
      ],
    },
    {
      name: "Diana Prince", email: "diana@example.com", passwordHash,
      birthDate: "1993-01-30",
      workExperience: [
        { id: "we-6", title: "Data Engineer", years: 4 },
      ],
    },
    {
      name: "Eve Wilson", email: "eve@example.com", passwordHash,
      birthDate: "1990-09-18",
      workExperience: [
        { id: "we-7", title: "DevOps Engineer", years: 4 },
        { id: "we-8", title: "Platform Engineer", years: 2 },
      ],
    },
  ]);

  const userSkillsAssignments = [[0, 1, 3], [0, 2], [0, 1, 2, 3], [4, 5], [6, 7]];
  for (let i = 0; i < users.length; i++) {
    users[i].skills = userSkillsAssignments[i].map((idx) => skills[idx]);
    await userRepo.save(users[i]);
  }

  const memberRepo = dataSource.getRepository(ProjectMember);
  await memberRepo.save([
    { user: users[0], project: projects[0], role: ProjectRole.ADMIN,   job: jobs[0] },
    { user: users[1], project: projects[0], role: ProjectRole.TRAINEE, job: jobs[1] },
    { user: users[2], project: projects[1], role: ProjectRole.ADMIN,   job: jobs[2] },
    { user: users[3], project: projects[2], role: ProjectRole.TRAINEE, job: jobs[3] },
    { user: users[4], project: projects[2], role: ProjectRole.ADMIN,   job: jobs[4] },
  ]);

  const onboardingRepo = dataSource.getRepository(OnBoarding);
  const sampleOnboarding = await onboardingRepo.save(
    onboardingRepo.create({ user: users[0], job: jobs[0], project: projects[0], status: 'ready' })
  );

  const taskRepo = dataSource.getRepository(Task);

  // Parent task 1 — Set Up Local Development Environment (0.5 days, completed)
  const task1 = await taskRepo.save(taskRepo.create({
    order: 1,
    title: 'Set Up Local Development Environment',
    description: 'Clone the repo, install dependencies, configure .env, and verify the dev server starts.',
    estimatedDays: 0.5,
    isCompleted: true,
    links: ['https://nodejs.org/en/docs', 'https://docs.npmjs.com/cli/v10'],
    onboarding: sampleOnboarding,
  }));
  await taskRepo.save([
    taskRepo.create({
      order: 1,
      title: 'Clone repository and install dependencies',
      description: 'Run git clone and npm install, ensuring all packages resolve without errors.',
      estimatedDays: 0.25,
      isCompleted: true,
      links: ['https://docs.npmjs.com/cli/v10'],
      onboarding: sampleOnboarding,
      parent: task1,
    }),
    taskRepo.create({
      order: 2,
      title: 'Configure environment variables and verify dev server',
      description: 'Copy .env.example to .env, fill in local values, then run npm run dev and confirm the app loads.',
      estimatedDays: 0.25,
      isCompleted: true,
      links: [],
      onboarding: sampleOnboarding,
      parent: task1,
    }),
  ]);

  // Parent task 2 — Review Codebase Architecture (1 day, completed)
  const task2 = await taskRepo.save(taskRepo.create({
    order: 2,
    title: 'Review Codebase Architecture',
    description: 'Read through the module structure — controllers, services, repositories — and trace a full request.',
    estimatedDays: 1,
    isCompleted: true,
    links: [],
    onboarding: sampleOnboarding,
  }));
  await taskRepo.save([
    taskRepo.create({
      order: 1,
      title: 'Read module structure and conventions',
      description: 'Go through each module folder and understand the controller → service → repository pattern.',
      estimatedDays: 0.5,
      isCompleted: true,
      links: [],
      onboarding: sampleOnboarding,
      parent: task2,
    }),
    taskRepo.create({
      order: 2,
      title: 'Trace a request flow end-to-end',
      description: 'Pick one existing feature and follow the request from route → controller → service → DB and back.',
      estimatedDays: 0.5,
      isCompleted: true,
      links: [],
      onboarding: sampleOnboarding,
      parent: task2,
    }),
  ]);

  // Parent task 3 — Implement Product Listing Page (2 days, in progress)
  const task3 = await taskRepo.save(taskRepo.create({
    order: 3,
    title: 'Implement Product Listing Page',
    description: 'Build the React component using TypeScript, fetch data from the API, and handle loading/error states.',
    estimatedDays: 2,
    isCompleted: false,
    links: ['https://react.dev/reference/react', 'https://www.typescriptlang.org/docs/handbook/intro.html'],
    onboarding: sampleOnboarding,
  }));
  await taskRepo.save([
    taskRepo.create({
      order: 1,
      title: 'Design component structure and local state',
      description: 'Sketch the component tree, decide which state lives locally vs. in a query hook.',
      estimatedDays: 0.5,
      isCompleted: false,
      links: [],
      onboarding: sampleOnboarding,
      parent: task3,
    }),
    taskRepo.create({
      order: 2,
      title: 'Build UI layout with TypeScript props',
      description: 'Implement the JSX layout, type all props, and apply Tailwind classes matching the design.',
      estimatedDays: 1,
      isCompleted: false,
      links: ['https://react.dev/reference/react', 'https://www.typescriptlang.org/docs/handbook/intro.html'],
      onboarding: sampleOnboarding,
      parent: task3,
    }),
    taskRepo.create({
      order: 3,
      title: 'Connect to API and handle loading/error states',
      description: 'Wire up the React Query hook, show a skeleton loader while fetching, and render an error message on failure.',
      estimatedDays: 0.5,
      isCompleted: false,
      links: ['https://tanstack.com/query/latest/docs/framework/react/overview'],
      onboarding: sampleOnboarding,
      parent: task3,
    }),
  ]);

  // Parent task 4 — Write Unit Tests (0.5 days)
  const task4 = await taskRepo.save(taskRepo.create({
    order: 4,
    title: 'Write Unit Tests',
    description: 'Add Jest + React Testing Library tests covering render, empty state, and data-loaded states.',
    estimatedDays: 0.5,
    isCompleted: false,
    links: ['https://jestjs.io/docs/getting-started'],
    onboarding: sampleOnboarding,
  }));
  await taskRepo.save([
    taskRepo.create({
      order: 1,
      title: 'Write render and snapshot tests',
      description: 'Assert the component mounts without crashing and matches its snapshot.',
      estimatedDays: 0.25,
      isCompleted: false,
      links: ['https://jestjs.io/docs/snapshot-testing'],
      onboarding: sampleOnboarding,
      parent: task4,
    }),
    taskRepo.create({
      order: 2,
      title: 'Write data-loaded and empty-state tests',
      description: 'Mock the API response, render with data, and assert list items appear; repeat for the empty state.',
      estimatedDays: 0.25,
      isCompleted: false,
      links: ['https://testing-library.com/docs/react-testing-library/intro'],
      onboarding: sampleOnboarding,
      parent: task4,
    }),
  ]);

  // Parent task 5 — Submit First Pull Request (1 day)
  const task5 = await taskRepo.save(taskRepo.create({
    order: 5,
    title: 'Submit First Pull Request',
    description: 'Open a PR, self-review, address reviewer comments, and get approval before merging.',
    estimatedDays: 1,
    isCompleted: false,
    links: ['https://docs.github.com/en/pull-requests'],
    onboarding: sampleOnboarding,
  }));
  await taskRepo.save([
    taskRepo.create({
      order: 1,
      title: 'Self-review and fix linting issues',
      description: 'Run the linter, fix all warnings, and re-read your diff to catch obvious mistakes.',
      estimatedDays: 0.5,
      isCompleted: false,
      links: [],
      onboarding: sampleOnboarding,
      parent: task5,
    }),
    taskRepo.create({
      order: 2,
      title: 'Address reviewer comments and get approval',
      description: 'Respond to each review comment, push fixes, and request re-review until the PR is approved.',
      estimatedDays: 0.5,
      isCompleted: false,
      links: [],
      onboarding: sampleOnboarding,
      parent: task5,
    }),
  ]);

  console.log("Seeding completed successfully.");
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error("Error during seeding:", err);
    process.exit(1);
  });
}
