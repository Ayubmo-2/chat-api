import { setOffline } from '../presence/setOffline';
import { publishPresence } from '../pubsub/publisher';
import type { Connection } from '../types';

export async function onDisconnect(conn: Connection): Promise<void> {
  if (!conn.userId) return;

  await setOffline(conn.userId);

  // Notify all rooms this user was in
  for (const roomId of conn.rooms) {
    await publishPresence(roomId, conn.userId, conn.username, 'offline').catch(() => {});
  }
}
