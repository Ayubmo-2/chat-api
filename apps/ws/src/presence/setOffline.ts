import { getRedis } from '../lib/redis';
import { isUserOnline } from '../connectionManager';

export async function setOffline(userId: string): Promise<void> {
  // Only delete the key if this was their last connection
  if (!isUserOnline(userId)) {
    const redis = getRedis();
    await redis.del(`user:${userId}:online`);
  }
}
