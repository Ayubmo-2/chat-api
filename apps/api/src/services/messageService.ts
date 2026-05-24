import { prisma } from '@chat-api/db';
import type { MessageDTO, PaginatedMessages } from '@chat-api/shared';
import { isMember } from './roomService';

const PAGE_SIZE = 30;

export async function getMessages(
  roomId: string,
  userId: string,
  cursor?: string
): Promise<PaginatedMessages> {
  const member = await isMember(roomId, userId);
  if (!member) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN' });
  }

  const messages = await prisma.message.findMany({
    where: { roomId },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = messages.length > PAGE_SIZE;
  const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return {
    messages: page.map((m) => ({
      id: m.id,
      content: m.content,
      userId: m.userId,
      username: m.user.username,
      roomId: m.roomId,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function persistMessage(
  roomId: string,
  userId: string,
  content: string
): Promise<MessageDTO> {
  const message = await prisma.message.create({
    data: { content, userId, roomId },
    include: { user: { select: { username: true } } },
  });

  return {
    id: message.id,
    content: message.content,
    userId: message.userId,
    username: message.user.username,
    roomId: message.roomId,
    createdAt: message.createdAt.toISOString(),
  };
}
