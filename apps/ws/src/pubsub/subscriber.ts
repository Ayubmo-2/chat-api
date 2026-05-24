import { getSubscriber } from '../lib/redis';
import { broadcastToRoom } from '../connectionManager';

const subscribed = new Set<string>();

export async function subscribeToRoom(roomId: string): Promise<void> {
  if (subscribed.has(roomId)) return;

  const sub = getSubscriber();
  await sub.subscribe(`room:${roomId}`);
  subscribed.add(roomId);
}

export function startMessageRouter(): void {
  const sub = getSubscriber();
  sub.on('message', (channel: string, message: string) => {
    const roomId = channel.replace('room:', '');
    try {
      const payload = JSON.parse(message);
      broadcastToRoom(roomId, payload);
    } catch {
      // malformed message, ignore
    }
  });
}
