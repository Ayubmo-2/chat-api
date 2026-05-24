import { getRedis } from '../lib/redis';

const TTL_SECONDS = 30;

export async function setOnline(userId: string, username: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`user:${userId}:online`, username, 'EX', TTL_SECONDS);
}
