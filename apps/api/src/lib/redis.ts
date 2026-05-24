import Redis from 'ioredis';
import { config } from '../config';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    _redis.on('error', (err) => {
      console.error('[redis] connection error', err.message);
    });
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
