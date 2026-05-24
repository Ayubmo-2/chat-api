import { prisma } from '@chat-api/db';

export default async function globalTeardown() {
  await prisma.$disconnect();
}
