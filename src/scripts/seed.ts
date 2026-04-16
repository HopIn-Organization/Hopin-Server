import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/user.entity';
import { Skill } from '../database/entities/skill.entity';
import { Job } from '../database/entities/job.entity';
import { Project } from '../database/entities/project.entity';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding');

    // Create skills
    const skillsData = ['JavaScript', 'TypeScript', 'Node.js', 'React', 'Python', 'SQL', 'Docker', 'AWS'];
    const skills: Skill[] = [];
    for (const name of skillsData) {
      let skill = await AppDataSource.getRepository(Skill).findOne({ where: { name } });
      if (!skill) {
        skill = AppDataSource.getRepository(Skill).create({ name });
        skill = await AppDataSource.getRepository(Skill).save(skill);
      }
      skills.push(skill);
    }
    console.log('Skills created');

    // Create projects
    const projectsData = [
      { name: 'E-commerce Platform', description: 'A full-stack e-commerce application' },
      { name: 'Task Management App', description: 'A collaborative task management tool' },
      { name: 'Data Analytics Dashboard', description: 'Real-time data visualization platform' }
    ];
    const projects: Project[] = [];
    for (const data of projectsData) {
      const project = AppDataSource.getRepository(Project).create(data);
      const saved = await AppDataSource.getRepository(Project).save(project);
      projects.push(saved);
    }
    console.log('Projects created');

    // Create jobs
    const jobsData = [
      { title: 'Frontend Developer', project: projects[0] },
      { title: 'Backend Developer', project: projects[0] },
      { title: 'Full Stack Developer', project: projects[1] },
      { title: 'Data Engineer', project: projects[2] },
      { title: 'DevOps Engineer', project: projects[2] }
    ];
    const jobs: Job[] = [];
    for (const data of jobsData) {
      const job = AppDataSource.getRepository(Job).create(data);
      const saved = await AppDataSource.getRepository(Job).save(job);
      jobs.push(saved);
    }
    console.log('Jobs created');

    // Assign skills to jobs
    const jobSkillsAssignments = [
      [0, 1, 3], // Frontend: JS, TS, React
      [0, 1, 2], // Backend: JS, TS, Node
      [0, 1, 2, 3], // Full Stack: JS, TS, Node, React
      [4, 5], // Data Engineer: Python, SQL
      [6, 7] // DevOps: Docker, AWS
    ];
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const skillIndices = jobSkillsAssignments[i];
      job.skills = skillIndices.map(idx => skills[idx]);
      await AppDataSource.getRepository(Job).save(job);
    }
    console.log('Job skills assigned');

    // Create users
    const usersData = [
      { name: 'Alice Johnson', experienceYears: 5 },
      { name: 'Bob Smith', experienceYears: 3 },
      { name: 'Charlie Brown', experienceYears: 7 },
      { name: 'Diana Prince', experienceYears: 4 },
      { name: 'Eve Wilson', experienceYears: 6 }
    ];
    const users: User[] = [];
    for (const data of usersData) {
      const user = AppDataSource.getRepository(User).create(data);
      const saved = await AppDataSource.getRepository(User).save(user);
      users.push(saved);
    }
    console.log('Users created');

    // Assign skills to users
    const userSkillsAssignments = [
      [0, 1, 3], // Alice: JS, TS, React
      [0, 2], // Bob: JS, Node
      [0, 1, 2, 3], // Charlie: JS, TS, Node, React
      [4, 5], // Diana: Python, SQL
      [6, 7] // Eve: Docker, AWS
    ];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const skillIndices = userSkillsAssignments[i];
      user.skills = skillIndices.map(idx => skills[idx]);
      await AppDataSource.getRepository(User).save(user);
    }
    console.log('User skills assigned');

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();