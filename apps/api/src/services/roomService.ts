import { prisma } from '@chat-api/db';
import type { RoomDTO } from '@chat-api/shared';

export async function createRoom(name: string, creatorId: string): Promise<RoomDTO> {
  const room = await prisma.room.create({
    data: {
      name,
      members: { create: { userId: creatorId } },
    },
    include: { _count: { select: { members: true } } },
  });

  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt.toISOString(),
    memberCount: room._count.members,
  };
}

export async function listRooms(userId: string): Promise<RoomDTO[]> {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: { include: { _count: { select: { members: true } } } },
    },
    orderBy: { room: { createdAt: 'desc' } },
  });

  return memberships.map((m) => ({
    id: m.room.id,
    name: m.room.name,
    createdAt: m.room.createdAt.toISOString(),
    memberCount: m.room._count.members,
  }));
}

export async function getRoom(roomId: string, userId: string): Promise<RoomDTO> {
  const membership = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId, roomId } },
    include: {
      room: { include: { _count: { select: { members: true } } } },
    },
  });

  if (!membership) {
    throw Object.assign(new Error('Room not found or access denied'), { code: 'NOT_FOUND' });
  }

  return {
    id: membership.room.id,
    name: membership.room.name,
    createdAt: membership.room.createdAt.toISOString(),
    memberCount: membership.room._count.members,
  };
}

export async function joinRoom(roomId: string, userId: string): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw Object.assign(new Error('Room not found'), { code: 'NOT_FOUND' });
  }

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId, roomId } },
    create: { userId, roomId },
    update: {},
  });
}

export async function isMember(roomId: string, userId: string): Promise<boolean> {
  const m = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId, roomId } },
  });
  return m !== null;
}
