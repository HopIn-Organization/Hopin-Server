import "reflect-metadata";
import { AppDataSource } from "../database/data-source";
import { User } from "../database/entities/user.entity";
import { Job } from "../job/job.entity";
import { Project } from "../project/project.entity";
import { ProjectMember, ProjectRole } from "../projectMember/projectMember.entity";
import { Skill } from "../skill/skill.entity";

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected for seeding");

    const skillsData = [
      "JavaScript",
      "TypeScript",
      "Node.js",
      "React",
      "Python",
      "SQL",
      "Docker",
      "AWS",
    ];

    const skillRepo = AppDataSource.getRepository(Skill);
    const skills: Skill[] = [];

    for (const name of skillsData) {
      let skill = await skillRepo.findOne({ where: { name } });
      if (!skill) {
        skill = await skillRepo.save(skillRepo.create({ name }));
      }
      skills.push(skill);
    }

    // Projects
    const projectRepo = AppDataSource.getRepository(Project);
    const projects = await projectRepo.save([
      { name: "E-commerce Platform", description: "A full-stack e-commerce application" },
      { name: "Task Management App", description: "A collaborative task management tool" },
      { name: "Data Analytics Dashboard", description: "Real-time data visualization platform" },
    ]);

    // Jobs
    const jobRepo = AppDataSource.getRepository(Job);
    const jobs = await jobRepo.save([
      { title: "Frontend Developer", project: projects[0] },
      { title: "Backend Developer", project: projects[0] },
      { title: "Full Stack Developer", project: projects[1] },
      { title: "Data Engineer", project: projects[2] },
      { title: "DevOps Engineer", project: projects[2] },
    ]);

    // Assign skills to jobs
    const jobSkillsAssignments = [
      [0, 1, 3],
      [0, 1, 2],
      [0, 1, 2, 3],
      [4, 5],
      [6, 7],
    ];

    for (let i = 0; i < jobs.length; i++) {
      jobs[i].skills = jobSkillsAssignments[i].map((idx) => skills[idx]);
      await jobRepo.save(jobs[i]);
    }

    // Users (✅ added emails)
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.save([
      { name: "Alice Johnson", email: "alice@example.com", experienceYears: 5 },
      { name: "Bob Smith", email: "bob@example.com", experienceYears: 3 },
      { name: "Charlie Brown", email: "charlie@example.com", experienceYears: 7 },
      { name: "Diana Prince", email: "diana@example.com", experienceYears: 4 },
      { name: "Eve Wilson", email: "eve@example.com", experienceYears: 6 },
    ]);

    // Assign skills to users
    const userSkillsAssignments = [
      [0, 1, 3],
      [0, 2],
      [0, 1, 2, 3],
      [4, 5],
      [6, 7],
    ];

    for (let i = 0; i < users.length; i++) {
      users[i].skills = userSkillsAssignments[i].map((idx) => skills[idx]);
      await userRepo.save(users[i]);
    }

    // ✅ Project Members (NOW WITH SINGLE JOB)
    const memberRepo = AppDataSource.getRepository(ProjectMember);

    const memberships = await memberRepo.save([
      {
        user: users[0],
        project: projects[0],
        role: ProjectRole.ADMIN,
        job: jobs[0], // Frontend
      },
      {
        user: users[1],
        project: projects[0],
        role: ProjectRole.TRAINEE,
        job: jobs[1], // Backend
      },
      {
        user: users[2],
        project: projects[1],
        role: ProjectRole.ADMIN,
        job: jobs[2], // Fullstack
      },
      {
        user: users[3],
        project: projects[2],
        role: ProjectRole.TRAINEE,
        job: jobs[3], // Data Engineer
      },
      {
        user: users[4],
        project: projects[2],
        role: ProjectRole.ADMIN,
        job: jobs[4], // DevOps
      },
    ]);

    console.log("Project members created with jobs");

    console.log("✅ Seeding completed successfully");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();