import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@chat-api/db';
import { config } from '../config';
import type { AuthTokens, UserPayload } from '@chat-api/shared';

const SALT_ROUNDS = 12;

function signTokens(userId: string, username: string, email: string): AuthTokens {
  const accessToken = jwt.sign(
    { userId, username, email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN as any }
  );
  const refreshToken = jwt.sign(
    { userId },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any }
  );
  return { accessToken, refreshToken };
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthTokens> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    throw Object.assign(new Error('Email or username already in use'), { code: 'DUPLICATE' });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { username, email, password: hash },
  });

  return signTokens(user.id, user.username, user.email);
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  return signTokens(user.id, user.username, user.email);
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { code: 'INVALID_TOKEN' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  }

  return signTokens(user.id, user.username, user.email);
}

export async function getProfile(userId: string): Promise<UserPayload> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { userId: user.id, username: user.username, email: user.email };
}
