import request from 'supertest';
import app from '../app';
import { initializeDatabase, AppDataSource } from '../database';

describe('Job Module', () => {
  let authToken: string;
  let projectId: number;
  const email = `jobuser_${Date.now()}@example.com`;
  const password = 'SecurePassword123!';

  beforeAll(async () => {
    await initializeDatabase();

    await request(app).post('/auth/register').send({
      email,
      password,
      name: 'Job User'
    });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');

    authToken = loginRes.body.accessToken;

    // Get the logged-in user's ID so we can add them as project admin
    const profileRes = await request(app)
      .get('/profile/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(profileRes.status).toBe(200);
    const userId = parseInt(profileRes.body.id);

    // Create a project with the user as admin and a seed job to satisfy member resolution
    const seedJobTitle = `Seed Job ${Date.now()}`;
    const projectRes = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Job Test Project ${Date.now()}`,
        jobs: [{ title: seedJobTitle }],
        members: [{ userId, role: 'admin' }]
      });
    expect(projectRes.status).toBe(201);
    projectId = projectRes.body.id;
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  test('GET /jobs should return jobs with skills and project', async () => {
    const res = await request(app)
      .get('/jobs')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('skills');
      expect(res.body[0]).toHaveProperty('project'); // allow null
      expect(Array.isArray(res.body[0].skills)).toBe(true);
    }
  });

  test('POST /jobs should create a job', async () => {
    const payload = { title: `Test Job ${Date.now()}`, projectId };
    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(Number), title: payload.title }));
  });

  test('POST /jobs invalid data should return 400', async () => {
    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ projectId });

    expect(res.status).toBe(400);
  });

  test('POST /jobs/:jobId/skills should create missing skills and attach them', async () => {
    const createResp = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: `Skill Add Job ${Date.now()}`, projectId });

    expect(createResp.status).toBe(201);
    const jobId = createResp.body.id;

    const s1 = `NestJS_${Date.now()}`;
    const s2 = `Cypress_${Date.now()}`;

    const skillResp = await request(app)
      .post(`/jobs/${jobId}/skills`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ skills: [s1, s2], projectId });

    expect([200, 201]).toContain(skillResp.status);
    expect(skillResp.body).toHaveProperty('skills');
    expect(skillResp.body.skills.map((s: any) => s.name)).toEqual(expect.arrayContaining([s1, s2]));
  });

  test('POST /jobs/:jobId/skills invalid should return 400', async () => {
    const createResp = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: `Skill Add Job 2 ${Date.now()}`, projectId });

    expect(createResp.status).toBe(201);
    const jobId = createResp.body.id;

    const skillResp = await request(app)
      .post(`/jobs/${jobId}/skills`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ skills: 'not-array', projectId });

    expect(skillResp.status).toBe(400);
  });
});