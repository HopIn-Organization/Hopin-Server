import crypto from 'crypto';

/**
 * Verifies GitHub's HMAC-SHA256 signature over the raw request body.
 * `body` must be the raw Buffer (the route uses express.raw()) — re-serialising
 * a parsed object would not reproduce the bytes GitHub signed.
 */
export function verifyWebhookSignature(
  body: Buffer,
  signature: string,
  secret: string
): boolean {
  const computed =
    'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

  const sigBuffer = Buffer.from(signature);
  const computedBuffer = Buffer.from(computed);

  // Buffers must be same length for timingSafeEqual
  if (sigBuffer.length !== computedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, computedBuffer);
}
