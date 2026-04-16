import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export const authenticateAccessToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing bearer token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = authService.verifyAccessToken(token);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId)) {
      res.status(401).json({ message: 'Invalid access token subject' });
      return;
    }

    req.user = {
      id: userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };

    next();
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
};