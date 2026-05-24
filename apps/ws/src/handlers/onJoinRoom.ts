import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from '@chat-api/db';
import type { JoinRoomMessage } from '@chat-api/shared';
import { setOnline } from '../presence/setOnline';
import { getOnlineUsers } from '../presence/getOnlineUsers';
import { subscribeToRoom } from '../pubsub/subscriber';
import { publishPresence } from '../pubsub/publisher';
import type { Connection } from '../types';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function onJoinRoom(
  conn: Connection,
  msg: JoinRoomMessage,
  ws: WebSocket
): Promise<void> {
  // Verify JWT
  let payload: { userId: string; username: string };
  try {
    payload = jwt.verify(msg.token, JWT_SECRET) as { userId: string; username: string };
  } catch {
    ws.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Invalid token' }));
    return;
  }

  // Check room membership
  const membership = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: payload.userId, roomId: msg.roomId } },
    include: {
      room: {
        include: { members: { select: { userId: true } } },
      },
    },
  });

  if (!membership) {
    ws.send(
      JSON.stringify({ type: 'error', code: 'FORBIDDEN', message: 'Not a member of this room' })
    );
    return;
  }

  // Track the connection in this room
  conn.userId = payload.userId;
  conn.username = payload.username;
  conn.rooms.add(msg.roomId);

  // Mark user online in Redis and subscribe to room channel
  await Promise.all([
    setOnline(payload.userId, payload.username),
    subscribeToRoom(msg.roomId),
  ]);

  // Get current online users in the room
  const memberIds = membership.room.members.map((m) => m.userId);
  const onlineUsers = await getOnlineUsers(memberIds);

  // Send confirmation with online users list
  ws.send(
    JSON.stringify({
      type: 'room_joined',
      roomId: msg.roomId,
      onlineUsers,
    })
  );

  // Notify others that this user is now online
  await publishPresence(msg.roomId, payload.userId, payload.username, 'online');
}
