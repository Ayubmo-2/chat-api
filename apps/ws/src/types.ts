import WebSocket from 'ws';

export interface Connection {
  ws: WebSocket;
  userId: string;
  username: string;
  rooms: Set<string>;
}
