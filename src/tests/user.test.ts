import request from 'supertest';
import app from '../app';
import { initializeDatabase, AppDataSource } from '../database';

describe('User Module', () => {
  let authToken: string;
  const email = `usertest_${Date.now()}@example.com`;
  const password = 'SecurePassword123!';

  beforeAll(async () => {
    await initializeDatabase();

    await request(app).post('/auth/register').send({
      email,
      password,
      name: 'User Test'
    });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  test('GET /users should return users with skills array', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          skills: expect.any(Array)
        })
      );
    }
  });

  test('POST /users should create user', async () => {
    const payload = { name: 'Test User', email: `createuser_${Date.now()}@example.com`, experienceYears: 2 };
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(Number), name: 'Test User' }));
  });

  test('POST /users with invalid data should return error', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Name is required' });
  });
});
