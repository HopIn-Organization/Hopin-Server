import 'express';
import type { LangfuseTrace } from '../../utils/langfuse';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email?: string;
      };
      langfuseTrace?: LangfuseTrace;
    }
  }
}

export {};
