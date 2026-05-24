import request from 'supertest';
import { app } from '../src/index';
import { cleanDb, registerAndLogin } from './helpers';

beforeEach(async () => {
  await cleanDb();
});

describe('POST /rooms', () => {
  it('creates a room and auto-joins the creator', async () => {
    const { accessToken } = await registerAndLogin('_rooms1');

    const res = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'general' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('general');
    expect(res.body.memberCount).toBe(1);
  });

  it('rejects empty name', async () => {
    const { accessToken } = await registerAndLogin('_rooms2');

    const res = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/rooms').send({ name: 'general' });
    expect(res.status).toBe(401);
  });
});

describe('GET /rooms', () => {
  it('returns only rooms the user belongs to', async () => {
    const { accessToken } = await registerAndLogin('_rooms3');
    const { accessToken: token2 } = await registerAndLogin('_rooms4');

    // User 1 creates a room; user 2 creates a different room
    await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'my-room' });

    await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${token2}`)
      .send({ name: 'their-room' });

    const res = await request(app)
      .get('/rooms')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('my-room');
  });
});

describe('GET /rooms/:roomId', () => {
  it('returns room details for a member', async () => {
    const { accessToken } = await registerAndLogin('_rooms5');

    const createRes = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test-room' });

    const { id: roomId } = createRes.body;

    const res = await request(app)
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(roomId);
  });

  it('returns 404 for a room the user is not in', async () => {
    const { accessToken: token1 } = await registerAndLogin('_rooms6');
    const { accessToken: token2 } = await registerAndLogin('_rooms7');

    const createRes = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'private-room' });

    const { id: roomId } = createRes.body;

    const res = await request(app)
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /rooms/:roomId/join', () => {
  it('allows a user to join an existing room', async () => {
    const { accessToken: token1 } = await registerAndLogin('_rooms8');
    const { accessToken: token2 } = await registerAndLogin('_rooms9');

    const createRes = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'open-room' });

    const { id: roomId } = createRes.body;

    const joinRes = await request(app)
      .post(`/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${token2}`);

    expect(joinRes.status).toBe(200);

    const roomRes = await request(app)
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(roomRes.status).toBe(200);
    expect(roomRes.body.memberCount).toBe(2);
  });
});
