import { getPublisher } from '../lib/redis';

export async function publishToRoom(roomId: string, payload: object): Promise<void> {
  const pub = getPublisher();
  await pub.publish(`room:${roomId}`, JSON.stringify(payload));
}

export async function publishPresence(
  roomId: string,
  userId: string,
  username: string,
  status: 'online' | 'offline'
): Promise<void> {
  await publishToRoom(roomId, {
    type: 'presence_update',
    roomId,
    userId,
    username,
    status,
  });
}
