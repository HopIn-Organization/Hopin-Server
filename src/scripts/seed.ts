import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { User } from "../database/entities/user.entity";
import { Job } from "../job/job.entity";
import { Project } from "../project/project.entity";
import { ProjectMember, ProjectRole } from "../projectMember/projectMember.entity";
import { Skill } from "../skill/skill.entity";

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

  const userRepo = dataSource.getRepository(User);
  const users = await userRepo.save([
    { name: "Alice Johnson", email: "alice@example.com", experienceYears: 5 },
    { name: "Bob Smith", email: "bob@example.com", experienceYears: 3 },
    { name: "Charlie Brown", email: "charlie@example.com", experienceYears: 7 },
    { name: "Diana Prince", email: "diana@example.com", experienceYears: 4 },
    { name: "Eve Wilson", email: "eve@example.com", experienceYears: 6 },
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

  console.log("Seeding completed successfully.");
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error("Error during seeding:", err);
    process.exit(1);
  });
}
