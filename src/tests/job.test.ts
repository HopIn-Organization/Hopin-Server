import request from 'supertest';
import app from '../app';
import { initializeDatabase, AppDataSource } from '../database';

describe('Job Module', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  test('GET /jobs should return jobs with skills and project', async () => {
    const res = await request(app).get('/jobs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          title: expect.any(String),
          skills: expect.any(Array),
          project: expect.anything()
        })
      );
    }
  });

  test('POST /jobs should create a job', async () => {
    const payload = { title: 'Test Job', project: null };
    const res = await request(app).post('/jobs').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(Number), title: 'Test Job' }));
  });

  test('POST /jobs invalid data should return 400', async () => {
    const res = await request(app).post('/jobs').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Title is required' });
  });

  test('POST /jobs/:jobId/skills should create missing skills and attach them', async () => {
    const createResp = await request(app).post('/jobs').send({ title: 'Skill Add Job', project: null });
    const jobId = createResp.body.id;

    const skillResp = await request(app).post(`/jobs/${jobId}/skills`).send({ skills: ['NestJS', 'Cypress'] });
    expect(skillResp.status).toBe(200);
    expect(skillResp.body.skills.map((s: any) => s.name)).toEqual(expect.arrayContaining(['NestJS', 'Cypress']));
  });

  test('POST /jobs/:jobId/skills invalid should return 400', async () => {
    const createResp = await request(app).post('/jobs').send({ title: 'Skill Add Job 2', project: null });
    const jobId = createResp.body.id;

    const skillResp = await request(app).post(`/jobs/${jobId}/skills`).send({ skills: 'not-array' });
    expect(skillResp.status).toBe(400);
    expect(skillResp.body).toEqual({ message: 'Skills should be an array of strings' });
  });
});
