import { DeepPartial } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Task } from '../task/task.entity';
import { reportLLMTrace } from '../utils/langfuse';

type GeminiTask = {
  order?: number | string;
  title?: string;
  description?: string;
  estimatedDays?: number | string;
  isCompleted?: boolean;
  links?: unknown;
  subtasks?: unknown;
  [key: string]: unknown;
};

type GeminiSubtask = {
  title?: string;
  description?: string;
  estimatedDays?: number | string;
  isCompleted?: boolean;
  links?: unknown;
  [key: string]: unknown;
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const normalizeEstimatedDays = (value: unknown, path: string): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid estimatedDays for ${path}`);
  }
  return numeric;
};

const normalizeSubtask = (
  value: unknown,
  taskIndex: number,
  subtaskIndex: number
): DeepPartial<Task> => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Subtask ${subtaskIndex + 1} of task ${taskIndex + 1} must be an object`);
  }

  const subtask = value as GeminiSubtask;

  if (typeof subtask.title !== 'string' || !subtask.title.trim()) {
    throw new Error(`Subtask ${subtaskIndex + 1} of task ${taskIndex + 1} is missing a valid title`);
  }

  if (typeof subtask.description !== 'string' || !subtask.description.trim()) {
    throw new Error(`Subtask ${subtaskIndex + 1} of task ${taskIndex + 1} is missing a valid description`);
  }

  return {
    title: subtask.title.trim(),
    description: subtask.description.trim(),
    estimatedDays: normalizeEstimatedDays(subtask.estimatedDays, `subtask ${subtaskIndex + 1} of task ${taskIndex + 1}`),
    isCompleted: typeof subtask.isCompleted === 'boolean' ? subtask.isCompleted : false,
    links: normalizeStringArray(subtask.links),
  };
};

const normalizeTask = (
  value: unknown,
  index: number
): DeepPartial<Task> & { subtasks?: DeepPartial<Task>[] } => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Task ${index + 1} must be an object`);
  }

  const task = value as GeminiTask;

  if (typeof task.title !== 'string' || !task.title.trim()) {
    throw new Error(`Task ${index + 1} is missing a valid title`);
  }

  if (typeof task.description !== 'string' || !task.description.trim()) {
    throw new Error(`Task ${index + 1} is missing a valid description`);
  }

  const normalizedSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map((subtask, subIndex) => normalizeSubtask(subtask, index, subIndex))
    : [];

  return {
    order: typeof task.order === 'number' && Number.isInteger(task.order) && task.order > 0 ? task.order : index + 1,
    title: task.title.trim(),
    description: task.description.trim(),
    estimatedDays: normalizeEstimatedDays(task.estimatedDays, `task ${index + 1}`),
    isCompleted: typeof task.isCompleted === 'boolean' ? task.isCompleted : false,
    links: normalizeStringArray(task.links),
    subtasks: normalizedSubtasks,
  };
};

const MODEL_NAME = 'gemini-3.5-flash';

export class LLMService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateOnboardingTasks(
    prompt: string,
    options?: {
      traceId?: string;
      sessionId?: string;
      userId?: string;
      trace?: any;
    }
  ): Promise<DeepPartial<Task>[]> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const usageMetadata = result.response.usageMetadata;

    const usage = usageMetadata
      ? {
          input: usageMetadata.promptTokenCount,
          output: usageMetadata.candidatesTokenCount,
          total:
            (usageMetadata.promptTokenCount || 0) +
            (usageMetadata.candidatesTokenCount || 0),
          unit: 'TOKENS' as const,
        }
      : undefined;

    let rawResponse: unknown;

    try {
      rawResponse = JSON.parse(text);
    } catch (error) {
      await reportLLMTrace({
        prompt,
        output: text,
        model: MODEL_NAME,
        trace: options?.trace,
        usage,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw new Error(`Failed to parse Gemini response as JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    const rawTasks = Array.isArray(rawResponse)
      ? rawResponse
      : rawResponse && typeof rawResponse === 'object' && Array.isArray((rawResponse as { tasks?: unknown }).tasks)
      ? (rawResponse as { tasks: unknown }).tasks
      : undefined;

    if (!Array.isArray(rawTasks)) {
      await reportLLMTrace({
        prompt,
        output: text,
        model: MODEL_NAME,
        trace: options?.trace,
        usage,
        metadata: {
          error: 'Unexpected response structure from Gemini: expected array or object with tasks field',
        },
      });

      throw new Error('Unexpected response structure from Gemini: expected array or object with tasks field');
    }

    let normalizedTasks: DeepPartial<Task>[];

    try {
      normalizedTasks = rawTasks.map((rawTask, index) => normalizeTask(rawTask, index));
    } catch (error) {
      await reportLLMTrace({
        prompt,
        output: text,
        model: MODEL_NAME,
        trace: options?.trace,
        usage,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }

    const seenOrders = new Set<number>();
    normalizedTasks.forEach((task, index) => {
      if (!task.order || seenOrders.has(task.order)) {
        task.order = index + 1;
      }
      seenOrders.add(task.order);
    });

    await reportLLMTrace({
      prompt,
      output: text,
      model: MODEL_NAME,
      trace: options?.trace,
      usage,
    });

    return normalizedTasks;
  }
}