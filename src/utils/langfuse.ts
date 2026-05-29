import { Request, Response, NextFunction } from 'express';
import { Langfuse } from 'langfuse';

const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;
const baseUrl = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL;

if (!publicKey || !secretKey) {
    throw new Error('Langfuse credentials are missing');
}

if (!baseUrl) {
    throw new Error('Langfuse baseUrl is missing');
}

export const langfuse = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: baseUrl.replace(/\/$/, ''),
});


export const reportLLMTrace = async (options: {
    prompt: string;
    output: string;
    model: string;
    trace?: any;
    traceId?: string;
    sessionId?: string;
    userId?: string;
    tags?: string[];
    usage?: {
        input?: number;
        output?: number;
        total?: number;
        unit?: "TOKENS" | "CHARACTERS" | "MILLISECONDS" | "SECONDS" | "IMAGES" | "REQUESTS";
    };
    metadata?: Record<string, unknown>;
}): Promise<void> => {
    const trace =
        options.trace ??
        langfuse.trace({
            id: options.traceId,
            name: `LLM call (${options.model})`,
            sessionId: options.sessionId,
            userId: options.userId,
            tags: ['langfuse', 'llm', options.model, ...(options.tags ?? [])],
            metadata: {
                model: options.model,
                ...options.metadata,
            },
        });

    trace.generation({
        name: `LLM generation (${options.model})`,
        input: options.prompt,
        output: options.output,
        model: options.model,
        usage: options.usage,
        metadata: options.metadata,
    });


    await langfuse.flushAsync();
};


export const langfuseMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const trace = langfuse.trace({
        name: `${req.method} ${req.originalUrl || req.url}`,
        metadata: {
            path: req.path,
            method: req.method,
        },
    });

    (req as any).langfuseTrace = trace;

    res.on('finish', () => {
        trace.update({
            metadata: {
                statusCode: res.statusCode,
            },
        });

        void langfuse.flushAsync();
    });

    next();
};