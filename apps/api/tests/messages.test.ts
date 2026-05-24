import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '@chat-api/db';
import { cleanDb, registerAndLogin } from './helpers';

beforeEach(async () => {
  await cleanDb();
});

async function createRoomAndMessages(
  token: string,
  userId: string,
  roomName: string,
  messageCount: number
): Promise<string> {
  const createRes = await request(app)
    .post('/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: roomName });

  const roomId: string = createRes.body.id;

  // Insert messages directly for speed
  for (let i = 0; i < messageCount; i++) {
    await prisma.message.create({
      data: { content: `Message ${i + 1}`, userId, roomId },
    });
  }

  return roomId;
}

describe('GET /rooms/:roomId/messages', () => {
  it('returns messages newest-first with default page size', async () => {
    const { accessToken, userId } = await registerAndLogin('_msg1');
    const roomId = await createRoomAndMessages(accessToken, userId, 'msg-room', 5);

    const res = await request(app)
      .get(`/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(5);
    expect(res.body.nextCursor).toBeNull();

    // Newest-first order
    const timestamps = res.body.messages.map((m: any) => new Date(m.createdAt).getTime());
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  it('paginates with cursor', async () => {
    const { accessToken, userId } = await registerAndLogin('_msg2');
    const roomId = await createRoomAndMessages(accessToken, userId, 'paginated-room', 35);

    const firstPage = await request(app)
      .get(`/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(firstPage.body.messages).toHaveLength(30);
    expect(firstPage.body.nextCursor).not.toBeNull();

    const secondPage = await request(app)
      .get(`/rooms/${roomId}/messages?cursor=${firstPage.body.nextCursor}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(secondPage.body.messages).toHaveLength(5);
    expect(secondPage.body.nextCursor).toBeNull();
  });

  it('returns 403 for non-member', async () => {
    const { accessToken: token1, userId } = await registerAndLogin('_msg3');
    const { accessToken: token2 } = await registerAndLogin('_msg4');

    const roomId = await createRoomAndMessages(token1, userId, 'private-room', 1);

    const res = await request(app)
      .get(`/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/rooms/fakeid/messages');
    expect(res.status).toBe(401);
  });
});
