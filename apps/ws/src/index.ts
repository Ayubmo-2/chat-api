import 'dotenv/config';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as Sentry from '@sentry/node';
import { addConnection, removeConnection } from './connectionManager';
import { onJoinRoom } from './handlers/onJoinRoom';
import { onChatMessage, onHeartbeat } from './handlers/onMessage';
import { onDisconnect } from './handlers/onDisconnect';
import { startMessageRouter } from './pubsub/subscriber';
import type { ClientMessage } from '@chat-api/shared';
import type { Connection } from './types';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
}

const PORT = Number(process.env.PORT ?? 4000);
const server = http.createServer((_req, res) => {
  res.writeHead(200).end('WS server');
});

const wss = new WebSocketServer({ server });

startMessageRouter();

wss.on('connection', (ws: WebSocket) => {
  const conn = addConnection('', '', ws) as unknown as Connection;

  ws.on('message', async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON', message: 'Bad JSON' }));
      return;
    }

    try {
      switch (msg.type) {
        case 'join_room':
          await onJoinRoom(conn, msg, ws);
          break;
        case 'message':
          await onChatMessage(conn, msg, ws);
          break;
        case 'heartbeat':
          await onHeartbeat(conn);
          break;
        default:
          ws.send(
            JSON.stringify({ type: 'error', code: 'UNKNOWN_TYPE', message: 'Unknown message type' })
          );
      }
    } catch (err) {
      Sentry.captureException(err);
      console.error('[ws] handler error', err);
      ws.send(JSON.stringify({ type: 'error', code: 'INTERNAL', message: 'Internal error' }));
    }
  });

  ws.on('close', async () => {
    removeConnection(conn.userId, conn as any);
    await onDisconnect(conn).catch(console.error);
  });

  ws.on('error', (err) => {
    Sentry.captureException(err);
    console.error('[ws] socket error', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`WS server listening on port ${PORT}`);
});
