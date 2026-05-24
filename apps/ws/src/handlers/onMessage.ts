import WebSocket from 'ws';
import { prisma } from '@chat-api/db';
import type { SendMessagePayload } from '@chat-api/shared';
import { publishToRoom } from '../pubsub/publisher';
import { setOnline } from '../presence/setOnline';
import type { Connection } from '../types';

export async function onChatMessage(
  conn: Connection,
  msg: SendMessagePayload,
  ws: WebSocket
): Promise<void> {
  if (!conn.userId) {
    ws.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Join a room first' }));
    return;
  }

  if (!conn.rooms.has(msg.roomId)) {
    ws.send(
      JSON.stringify({ type: 'error', code: 'FORBIDDEN', message: 'Not joined to this room' })
    );
    return;
  }

  if (!msg.content?.trim()) {
    ws.send(JSON.stringify({ type: 'error', code: 'INVALID', message: 'Empty message' }));
    return;
  }

  // Persist to Postgres
  const message = await prisma.message.create({
    data: {
      content: msg.content.trim(),
      userId: conn.userId,
      roomId: msg.roomId,
    },
    include: { user: { select: { username: true } } },
  });

  // Fan-out via Redis pub/sub so all WS instances deliver it
  await publishToRoom(msg.roomId, {
    type: 'message_received',
    messageId: message.id,
    userId: message.userId,
    username: message.user.username,
    roomId: message.roomId,
    content: message.content,
    ts: message.createdAt.toISOString(),
  });
}

export async function onHeartbeat(conn: Connection): Promise<void> {
  if (conn.userId) {
    await setOnline(conn.userId, conn.username);
  }
}
