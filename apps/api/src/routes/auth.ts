import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authRateLimit } from '../middleware/rateLimit';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(2).max(32).regex(/^\w+$/, 'Only letters, numbers, underscores'),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const tokens = await authService.register(
      parsed.data.username,
      parsed.data.email,
      parsed.data.password
    );
    res.status(201).json(tokens);
  } catch (err: any) {
    if (err.code === 'DUPLICATE') {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const tokens = await authService.login(parsed.data.email, parsed.data.password);
    res.json(tokens);
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    throw err;
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken required' });
    return;
  }

  try {
    const tokens = await authService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const profile = await authService.getProfile((req as AuthRequest).userId);
  res.json(profile);
});

export default router;
