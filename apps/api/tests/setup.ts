import { execSync } from 'child_process';

// Runs once before all test suites
export default async function globalSetup() {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://chatuser:chatpass@localhost:5432/chatdb_test';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-16-chars';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-16-chars';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';

  // Run migrations on the test database
  execSync('npx prisma migrate deploy --schema=../../packages/db/prisma/schema.prisma', {
    env: { ...process.env },
    stdio: 'inherit',
  });
}
