import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId: string;
  username: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      username: string;
    };
    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}
