import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from './webhook-signature';
import { isWebhookAllowed, logWebhookRequest } from './webhook-debug';
import { InstallationEventHandler } from './installation-event.handler';
import { PushEventHandler } from './push-event.handler';

export class GithubWebhookController {
  private installationHandler: InstallationEventHandler;
  private pushHandler: PushEventHandler;

  constructor() {
    this.installationHandler = new InstallationEventHandler();
    this.pushHandler = new PushEventHandler();
  }

  handle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Opt-in switch. While off, deliveries are logged in full and acked but
      // never acted on — lets you point a GitHub App at this server and inspect
      // what arrives before wiring it up for real.
      if (!isWebhookAllowed()) {
        logWebhookRequest(req);
        // Still ack — a non-2xx makes GitHub retry the same delivery
        res.sendStatus(200);
        return;
      }

      // Verify the HMAC-SHA256 signature before processing anything else.
      // req.body is a raw Buffer here because the route uses express.raw().
      const sig = req.headers['x-hub-signature-256'] as string | undefined;
      const secret = process.env.GITHUB_WEBHOOK_SECRET;

      console.log(
        '[GitHub Webhook] Received event:',
        req.headers['x-github-event'],
        'with signature:',
        sig
      );
      if (!secret) {
        console.error('[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not set');
        res.status(500).json({ error: 'Webhook secret not configured' });
        return;
      }

      if (!sig) {
        res.status(401).json({ error: 'Missing x-hub-signature-256 header' });
        return;
      }

      if (!verifyWebhookSignature(req.body as Buffer, sig, secret)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const event = req.headers['x-github-event'] as string;
      const payload = JSON.parse((req.body as Buffer).toString('utf8'));

      if (event === 'installation') {
        await this.installationHandler.handle(payload);
        // Ack quickly — no further processing needed for installation events
        res.sendStatus(200);
        return;
      }

      if (event === 'push') {
        await this.pushHandler.handle(payload);
      }

      // Always ack immediately — GitHub retries if we return non-2xx
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  };
}

export const githubWebhookController = new GithubWebhookController();
