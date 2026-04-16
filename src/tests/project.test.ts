import request from 'supertest';
import app from '../app';
import { initializeDatabase, AppDataSource } from '../database';

describe('Project Module', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  test('GET /projects should return projects with jobs', async () => {
    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          jobs: expect.any(Array)
        })
      );
    }
  });

  test('POST /projects should create a project', async () => {
    const payload = { name: 'Test Project', description: 'Test project description' };
    const res = await request(app).post('/projects').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(Number), name: 'Test Project' }));
  });

  test('POST /projects invalid data should return 400', async () => {
    const res = await request(app).post('/projects').send({ description: 'missing name' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Name is required' });
  });
});
