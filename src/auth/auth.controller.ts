import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const REFRESH_COOKIE_NAME = 'refresh_token';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ message: 'name, email and password are required' });
        return;
      }

      const user = await this.authService.register(name, String(email).toLowerCase(), String(password));
      res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({ message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'email and password are required' });
        return;
      }

      const tokens = await this.authService.login(String(email).toLowerCase(), String(password));
      this.setRefreshCookie(res, tokens.refreshToken);
      res.json({ accessToken: tokens.accessToken });
    } catch (_error) {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!refreshToken || typeof refreshToken !== 'string') {
        res.status(401).json({ message: 'Refresh token is required' });
        return;
      }

      const tokens = await this.authService.refresh(refreshToken);
      this.setRefreshCookie(res, tokens.refreshToken);
      res.json({ accessToken: tokens.accessToken });
    } catch (_error) {
      this.clearRefreshCookie(res);
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      await this.authService.logout(userId);
      this.clearRefreshCookie(res);
      res.status(204).send();
    } catch (_error) {
      res.status(500).json({ message: 'Logout failed' });
    }
  };

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: this.authService.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }
}