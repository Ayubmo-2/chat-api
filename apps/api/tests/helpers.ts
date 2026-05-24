import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '@chat-api/db';

export async function cleanDb() {
  await prisma.message.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
}

export async function registerAndLogin(
  suffix = ''
): Promise<{ accessToken: string; userId: string; username: string }> {
  const username = `testuser${suffix}`;
  const email = `test${suffix}@example.com`;

  await request(app).post('/auth/register').send({
    username,
    email,
    password: 'Password123!',
  });

  const res = await request(app).post('/auth/login').send({
    email,
    password: 'Password123!',
  });

  const { accessToken } = res.body;

  const meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);

  return { accessToken, userId: meRes.body.userId, username };
}
