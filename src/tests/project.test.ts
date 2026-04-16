import request from 'supertest';
import app from '../app';
import { initializeDatabase, AppDataSource } from '../database';

describe('Project Module', () => {
  let authToken: string;

  beforeAll(async () => {
    await initializeDatabase();
    await request(app).post('/auth/register').send({
      email: 'projectuser@example.com',
      password: 'SecurePassword123!',
      name: 'Project User'
    });
    const loginRes = await request(app).post('/auth/login').send({
      email: 'projectuser@example.com',
      password: 'SecurePassword123!'
    });
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  test('GET /projects should return projects', async () => {
    const res = await request(app)
      .get('/projects')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /projects should create a project', async () => {
    const payload = { name: 'Test Project', description: 'Test project description' };
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ name: 'Test Project' }));
  });

  test('POST /projects invalid data should return 400', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'missing name' });
    expect(res.status).toBe(400);
  });
});