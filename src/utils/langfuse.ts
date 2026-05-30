import { Request, Response, NextFunction } from 'express';
// import { randomBytes } from 'crypto';
// import { TraceFlags, type SpanContext } from '@opentelemetry/api';
// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { LangfuseSpanProcessor } from '@langfuse/otel';
// import {
//   startObservation,
//   createTraceId,
//   type LangfuseGenerationAttributes,
//   type LangfuseSpan,
// } from '@langfuse/tracing';

// const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
// const secretKey = process.env.LANGFUSE_SECRET_KEY;
// const baseUrl = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL;
// const isLangfuseDisabled =
//   process.env.NODE_ENV === 'test' || process.env.LANGFUSE_ENABLED === 'false';

// if (!isLangfuseDisabled && (!publicKey || !secretKey)) {
//   throw new Error('Langfuse credentials are missing');
// }

// if (!isLangfuseDisabled && !baseUrl) {
//   throw new Error('Langfuse baseUrl is missing');
// }

// const normalizedBaseUrl = baseUrl?.replace(/\/$/, '');

// const langfuseSpanProcessor: LangfuseSpanProcessor | undefined =
//   isLangfuseDisabled
//     ? undefined
//     : new LangfuseSpanProcessor({
//         publicKey,
//         secretKey,
//         baseUrl: normalizedBaseUrl,
//       });

// export const langfuseSdk: NodeSDK | undefined = langfuseSpanProcessor
//   ? new NodeSDK({
//       spanProcessors: [langfuseSpanProcessor],
//     })
//   : undefined;

// langfuseSdk?.start();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LangfuseTrace = any;

// type UsageUnit =
//   | 'TOKENS'
//   | 'CHARACTERS'
//   | 'MILLISECONDS'
//   | 'SECONDS'
//   | 'IMAGES'
//   | 'REQUESTS';

// type LLMTraceUsage = {
//   input?: number;
//   output?: number;
//   total?: number;
//   unit?: UsageUnit;
// };

// const toUsageDetails = (
//   usage?: LLMTraceUsage
// ): LangfuseGenerationAttributes['usageDetails'] | undefined => {
//   if (!usage) {
//     return undefined;
//   }
//   return {
//     ...(usage.input !== undefined ? { input: usage.input } : {}),
//     ...(usage.output !== undefined ? { output: usage.output } : {}),
//     ...(usage.total !== undefined ? { total: usage.total } : {}),
//     ...(usage.unit === 'TOKENS' && usage.input !== undefined
//       ? { promptTokens: usage.input }
//       : {}),
//     ...(usage.unit === 'TOKENS' && usage.output !== undefined
//       ? { completionTokens: usage.output }
//       : {}),
//     ...(usage.unit === 'TOKENS' && usage.total !== undefined
//       ? { totalTokens: usage.total }
//       : {}),
//   };
// };

// const isTraceId = (value: string): boolean => /^[0-9a-f]{32}$/i.test(value);

// const getParentSpanContext = async (
//   traceId?: string
// ): Promise<SpanContext | undefined> => {
//   if (!traceId) {
//     return undefined;
//   }
//   return {
//     traceId: isTraceId(traceId) ? traceId.toLowerCase() : await createTraceId(traceId),
//     spanId: randomBytes(8).toString('hex'),
//     traceFlags: TraceFlags.SAMPLED,
//   };
// };

export const flushLangfuse = async (): Promise<void> => {
  // await langfuseSpanProcessor?.forceFlush();
};

export const shutdownLangfuse = async (): Promise<void> => {
  // await langfuseSdk?.shutdown();
};

export const reportLLMTrace = async (_options: {
  prompt: string;
  output: string;
  model: string;
  trace?: LangfuseTrace;
  traceId?: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  usage?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  // Langfuse tracing disabled until credentials are available
};

export const langfuseMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.langfuseTrace = undefined;
  next();
};
