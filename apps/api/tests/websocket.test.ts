/**
 * WS integration test: spins up a real WS server, registers two users,
 * sends a message, and asserts both clients receive it.
 *
 * Requires a running Redis + Postgres (same as other tests).
 */
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/index';
import { prisma } from '@chat-api/db';
import { cleanDb } from './helpers';

// We import the WS handler logic directly to avoid needing a separate process
import { addConnection, removeConnection } from '../../ws/src/connectionManager';
import { onJoinRoom } from '../../ws/src/handlers/onJoinRoom';
import { onChatMessage } from '../../ws/src/handlers/onMessage';
import { startMessageRouter } from '../../ws/src/pubsub/subscriber';
import type { Connection } from '../../ws/src/types';

const WS_PORT = 4001;
let wss: WebSocketServer;
let httpServer: http.Server;

function waitForMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(JSON.parse(data.toString())));
  });
}

beforeAll(async () => {
  httpServer = http.createServer();
  wss = new WebSocketServer({ server: httpServer });
  startMessageRouter();

  wss.on('connection', (ws) => {
    const conn = addConnection('', '', ws) as unknown as Connection;

    ws.on('message', async (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'join_room') await onJoinRoom(conn, msg, ws);
      if (msg.type === 'message') await onChatMessage(conn, msg, ws);
    });

    ws.on('close', () => removeConnection(conn.userId, conn as any));
  });

  await new Promise<void>((resolve) => httpServer.listen(WS_PORT, resolve));
});

afterAll(async () => {
  wss.close();
  httpServer.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDb();
});

describe('WebSocket message delivery', () => {
  it('delivers a message to both sender and receiver in the same room', async () => {
    // Register two users
    const reg1 = await request(app).post('/auth/register').send({
      username: 'wsuser1',
      email: 'wsuser1@test.com',
      password: 'Password123!',
    });
    const reg2 = await request(app).post('/auth/register').send({
      username: 'wsuser2',
      email: 'wsuser2@test.com',
      password: 'Password123!',
    });

    const token1 = reg1.body.accessToken as string;
    const token2 = reg2.body.accessToken as string;

    // User 1 creates a room
    const roomRes = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'ws-test-room' });
    const roomId: string = roomRes.body.id;

    // User 2 joins the room
    await request(app)
      .post(`/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${token2}`);

    // Connect both clients via WS
    const ws1 = new WebSocket(`ws://localhost:${WS_PORT}`);
    const ws2 = new WebSocket(`ws://localhost:${WS_PORT}`);

    await Promise.all([
      new Promise<void>((r) => ws1.on('open', r)),
      new Promise<void>((r) => ws2.on('open', r)),
    ]);

    // Both clients join the room
    ws1.send(JSON.stringify({ type: 'join_room', roomId, token: token1 }));
    const joined1 = await waitForMessage(ws1);
    expect(joined1.type).toBe('room_joined');

    ws2.send(JSON.stringify({ type: 'join_room', roomId, token: token2 }));
    // ws1 gets a presence_update first, then ws2 gets room_joined
    const [presenceMsg, joined2] = await Promise.all([
      waitForMessage(ws1),
      waitForMessage(ws2),
    ]);

    expect(joined2.type).toBe('room_joined');
    expect(presenceMsg.type).toBe('presence_update');

    // ws1 sends a chat message
    const receivePromise1 = waitForMessage(ws1);
    const receivePromise2 = waitForMessage(ws2);

    ws1.send(JSON.stringify({ type: 'message', roomId, content: 'Hello world!' }));

    const [msg1, msg2] = await Promise.all([receivePromise1, receivePromise2]);

    expect(msg1.type).toBe('message_received');
    expect(msg1.content).toBe('Hello world!');
    expect(msg2.type).toBe('message_received');
    expect(msg2.content).toBe('Hello world!');

    ws1.close();
    ws2.close();
  });
});
