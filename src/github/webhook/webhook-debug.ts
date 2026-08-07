import { Request } from 'express';

/** Env flag gating whether webhooks are actually processed. */
export const ALLOW_WEBHOOK_ENV = 'ALLOW_GITHUB_WEBHOOK';

/** Raw bodies are dumped verbatim; cap them so a big push doesn't flood the log. */
const MAX_BODY_CHARS = 1000;

export function isWebhookAllowed(): boolean {
  return process.env[ALLOW_WEBHOOK_ENV] === 'true';
}

/**
 * Dumps everything the webhook received. Used when the webhook is disabled so
 * deliveries can still be inspected during setup without being acted on.
 */
export function logWebhookRequest(req: Request): void {
  console.warn(
    `[GitHub Webhook] ${ALLOW_WEBHOOK_ENV} is not "true" — webhook processing is DISABLED. ` +
      `Declare ${ALLOW_WEBHOOK_ENV}=true in the environment to enable it. ` +
      'Logging the received delivery for debugging:'
  );

  console.warn(
    '[GitHub Webhook][debug] method:',
    req.method,
    'url:',
    req.originalUrl
  );
  console.warn('[GitHub Webhook][debug] headers:', req.headers);

  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  if (!raw) {
    console.warn('[GitHub Webhook][debug] body: <empty>');
    return;
  }

  const truncated =
    raw.length > MAX_BODY_CHARS
      ? `${raw.slice(0, MAX_BODY_CHARS)}… (truncated, ${raw.length} chars total)`
      : raw;

  console.warn('[GitHub Webhook][debug] body:', truncated);
}
