import { getRedis } from '../lib/redis';

export async function getOnlineUsers(
  roomUserIds: string[]
): Promise<Array<{ userId: string; username: string }>> {
  if (roomUserIds.length === 0) return [];

  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const userId of roomUserIds) {
    pipeline.get(`user:${userId}:online`);
  }
  const results = await pipeline.exec();
  if (!results) return [];

  const online: Array<{ userId: string; username: string }> = [];
  for (let i = 0; i < results.length; i++) {
    const [err, username] = results[i];
    if (!err && typeof username === 'string') {
      online.push({ userId: roomUserIds[i], username });
    }
  }
  return online;
}
