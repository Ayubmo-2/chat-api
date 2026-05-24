import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as roomService from '../services/roomService';

const router = Router();

router.use(requireAuth);

const createRoomSchema = z.object({
  name: z.string().min(1).max(64),
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const room = await roomService.createRoom(parsed.data.name, (req as AuthRequest).userId);
  res.status(201).json(room);
});

router.get('/', async (req: Request, res: Response) => {
  const rooms = await roomService.listRooms((req as AuthRequest).userId);
  res.json(rooms);
});

router.get('/:roomId', async (req: Request, res: Response) => {
  try {
    const room = await roomService.getRoom(req.params.roomId, (req as AuthRequest).userId);
    res.json(room);
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post('/:roomId/join', async (req: Request, res: Response) => {
  try {
    await roomService.joinRoom(req.params.roomId, (req as AuthRequest).userId);
    res.status(200).json({ joined: true });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
});

export default router;
