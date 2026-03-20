import request from 'supertest';
import app from '../app';

describe('Auth Endpoints', () => {
  const testUser = {
    businessName: 'Test Corp',
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
  };

  let accessToken: string;

  it('POST /api/auth/register — should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('POST /api/auth/login — should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;
  });

  it('POST /api/auth/login — should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me — should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('GET /api/auth/me — should reject without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});