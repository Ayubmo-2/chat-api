import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let _publisher: Redis | null = null;
let _subscriber: Redis | null = null;

export function getPublisher(): Redis {
  if (!_publisher) {
    _publisher = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });
    _publisher.on('error', (err) => console.error('[redis:pub]', err.message));
  }
  return _publisher;
}

export function getSubscriber(): Redis {
  if (!_subscriber) {
    _subscriber = new Redis(REDIS_URL, { maxRetriesPerRequest: null as any });
    _subscriber.on('error', (err) => console.error('[redis:sub]', err.message));
  }
  return _subscriber;
}

export function getRedis(): Redis {
  return getPublisher();
}
