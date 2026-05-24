import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as messageService from '../services/messageService';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  try {
    const result = await messageService.getMessages(
      req.params.roomId,
      (req as AuthRequest).userId,
      cursor
    );
    res.json(result);
  } catch (err: any) {
    if (err.code === 'FORBIDDEN') {
      res.status(403).json({ error: 'Not a member of this room' });
      return;
    }
    throw err;
  }
});

export default router;
