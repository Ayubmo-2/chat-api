import request from 'supertest';
import { app } from '../src/index';
import { cleanDb } from './helpers';

beforeEach(async () => {
  await cleanDb();
});

describe('POST /auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });

    const res = await request(app).post('/auth/register').send({
      username: 'alice2',
      email: 'alice@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
  });

  it('rejects duplicate username', async () => {
    await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });

    const res = await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice2@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
  });

  it('rejects weak password (< 8 chars)', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'bob',
      email: 'bob@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'bob',
      email: 'not-an-email',
      password: 'Password123!',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });
  });

  it('returns tokens for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('issues new tokens from valid refresh token', async () => {
    const registerRes = await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });
    const { refreshToken } = registerRes.body;

    const res = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects invalid refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'bad.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns profile for authenticated user', async () => {
    const registerRes = await request(app).post('/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });
    const { accessToken } = registerRes.body;

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.email).toBe('alice@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
