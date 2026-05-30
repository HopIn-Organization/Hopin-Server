import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { TraceFlags, type SpanContext } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import {
  startObservation,
  createTraceId,
  type LangfuseGenerationAttributes,
  type LangfuseSpan,
} from '@langfuse/tracing';

const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;
const baseUrl = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL;
const isLangfuseDisabled =
  process.env.NODE_ENV === 'test' || process.env.LANGFUSE_ENABLED === 'false';

if (!isLangfuseDisabled && (!publicKey || !secretKey)) {
  throw new Error('Langfuse credentials are missing');
}

if (!isLangfuseDisabled && !baseUrl) {
  throw new Error('Langfuse baseUrl is missing');
}

const normalizedBaseUrl = baseUrl?.replace(/\/$/, '');

const langfuseSpanProcessor: LangfuseSpanProcessor | undefined =
  isLangfuseDisabled
    ? undefined
    : new LangfuseSpanProcessor({
        publicKey,
        secretKey,
        baseUrl: normalizedBaseUrl,
      });

export const langfuseSdk: NodeSDK | undefined = langfuseSpanProcessor
  ? new NodeSDK({
      spanProcessors: [langfuseSpanProcessor],
    })
  : undefined;

langfuseSdk?.start();

export type LangfuseTrace = LangfuseSpan;

type UsageUnit =
  | 'TOKENS'
  | 'CHARACTERS'
  | 'MILLISECONDS'
  | 'SECONDS'
  | 'IMAGES'
  | 'REQUESTS';

type LLMTraceUsage = {
  input?: number;
  output?: number;
  total?: number;
  unit?: UsageUnit;
};

const toUsageDetails = (
  usage?: LLMTraceUsage
): LangfuseGenerationAttributes['usageDetails'] | undefined => {
  if (!usage) {
    return undefined;
  }
  return {
    ...(usage.input !== undefined ? { input: usage.input } : {}),
    ...(usage.output !== undefined ? { output: usage.output } : {}),
    ...(usage.total !== undefined ? { total: usage.total } : {}),
    ...(usage.unit === 'TOKENS' && usage.input !== undefined
      ? { promptTokens: usage.input }
      : {}),
    ...(usage.unit === 'TOKENS' && usage.output !== undefined
      ? { completionTokens: usage.output }
      : {}),
    ...(usage.unit === 'TOKENS' && usage.total !== undefined
      ? { totalTokens: usage.total }
      : {}),
  };
};

const isTraceId = (value: string): boolean => /^[0-9a-f]{32}$/i.test(value);

const getParentSpanContext = async (
  traceId?: string
): Promise<SpanContext | undefined> => {
  if (!traceId) {
    return undefined;
  }
  return {
    traceId: isTraceId(traceId) ? traceId.toLowerCase() : await createTraceId(traceId),
    spanId: randomBytes(8).toString('hex'),
    traceFlags: TraceFlags.SAMPLED,
  };
};

export const flushLangfuse = async (): Promise<void> => {
  await langfuseSpanProcessor?.forceFlush();
};

export const shutdownLangfuse = async (): Promise<void> => {
  await langfuseSdk?.shutdown();
};

export const reportLLMTrace = async (options: {
  prompt: string;
  output: string;
  model: string;
  trace?: LangfuseTrace;
  traceId?: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  usage?: LLMTraceUsage;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  const generationAttributes: LangfuseGenerationAttributes = {
    input: options.prompt,
    output: options.output,
    model: options.model,
    usageDetails: toUsageDetails(options.usage),
    metadata: options.metadata,
  };

  const generation = options.trace
    ? options.trace.startObservation(
        `LLM generation (${options.model})`,
        generationAttributes,
        { asType: 'generation' }
      )
    : startObservation(
        `LLM call (${options.model})`,
        generationAttributes,
        {
          asType: 'generation',
          parentSpanContext: await getParentSpanContext(options.traceId),
        }
      );

  generation.updateTrace({
    name: `LLM call (${options.model})`,
    sessionId: options.sessionId,
    userId: options.userId,
    tags: ['langfuse', 'llm', options.model, ...(options.tags ?? [])],
    metadata: {
      model: options.model,
      ...options.metadata,
    },
  });

  generation.end();
  await flushLangfuse();
};

export const langfuseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const name = `${req.method} ${req.originalUrl || req.url}`;
  const trace = startObservation(name, {
    input: {
      method: req.method,
      path: req.path,
      query: req.query,
    },
    metadata: {
      path: req.path,
      method: req.method,
    },
  });

  trace.updateTrace({
    name,
    metadata: {
      path: req.path,
      method: req.method,
    },
  });

  req.langfuseTrace = trace;

  res.on('finish', () => {
    trace.update({
      output: {
        statusCode: res.statusCode,
      },
      metadata: {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
      },
    });
    trace.end();

    void flushLangfuse();
  });

  next();
};
