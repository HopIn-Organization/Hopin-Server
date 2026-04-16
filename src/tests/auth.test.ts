import request from 'supertest';
import app from '../app';
import { initializeDatabase, AppDataSource } from '../database';

describe('Auth Module', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('POST /auth/register', () => {
    test('should register a new user', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const res = await request(app).post('/auth/register').send({
        email,
        password: 'SecurePassword123!',
        name: 'Test User'
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          email,
          name: 'Test User'
        })
      );
    });

    test('should return 400 for missing required fields', async () => {
      const res = await request(app).post('/auth/register').send({ password: 'SecurePassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    test('should return 400 for missing password', async () => {
      const res = await request(app).post('/auth/register').send({
        email: `missing_pass_${Date.now()}@example.com`,
        name: 'Test User'
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    test('should reject duplicate email', async () => {
      const email = `dup_${Date.now()}@example.com`;
      const payload = { email, password: 'SecurePassword123!', name: 'Dup User' };

      await request(app).post('/auth/register').send(payload);
      const res = await request(app).post('/auth/register').send(payload);

      // your API currently returns 400 for this case
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    const loginEmail = `logintest_${Date.now()}@example.com`;
    const loginPassword = 'SecurePassword123!';

    beforeAll(async () => {
      await request(app).post('/auth/register').send({
        email: loginEmail,
        password: loginPassword,
        name: 'Login Test User'
      });
    });

    test('should login with valid credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: loginEmail,
        password: loginPassword
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    test('should return 400 for missing email', async () => {
      const res = await request(app).post('/auth/login').send({ password: loginPassword });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    test('should return 401 for invalid credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: loginEmail,
        password: 'WrongPassword'
      });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid');
    });

    test('should return 401 for non-existent user', async () => {
      const res = await request(app).post('/auth/login').send({
        email: `no_user_${Date.now()}@example.com`,
        password: loginPassword
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    test('should logout user with valid token', async () => {
      const email = `logout_${Date.now()}@example.com`;
      const password = 'SecurePassword123!';

      await request(app).post('/auth/register').send({ email, password, name: 'Logout User' });
      const loginRes = await request(app).post('/auth/login').send({ email, password });

      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(res.status).toBe(204); // your API returns 204
    });

    test('should return 401 without token', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('token');
    });
  });
});