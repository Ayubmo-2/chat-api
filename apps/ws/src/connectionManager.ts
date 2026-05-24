import WebSocket from 'ws';
import type { Connection } from './types';

const connections = new Map<string, Set<Connection>>();

export function addConnection(userId: string, username: string, ws: WebSocket): Connection {
  const conn: Connection = { ws, userId, username, rooms: new Set() };
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(conn);
  return conn;
}

export function removeConnection(userId: string, conn: Connection): void {
  const userConns = connections.get(userId);
  if (!userConns) return;
  userConns.delete(conn);
  if (userConns.size === 0) {
    connections.delete(userId);
  }
}

export function getConnectionsInRoom(roomId: string): Connection[] {
  const result: Connection[] = [];
  for (const userConns of connections.values()) {
    for (const conn of userConns) {
      if (conn.rooms.has(roomId)) {
        result.push(conn);
      }
    }
  }
  return result;
}

export function broadcastToRoom(roomId: string, payload: object): void {
  const data = JSON.stringify(payload);
  for (const conn of getConnectionsInRoom(roomId)) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(data);
    }
  }
}

export function isUserOnline(userId: string): boolean {
  return (connections.get(userId)?.size ?? 0) > 0;
}
