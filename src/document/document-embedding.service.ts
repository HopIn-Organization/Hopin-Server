import { BatchEmbedContentsRequest, GenerativeModel, GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const EMBEDDING_MODEL = 'text-embedding-004';
const BATCH_SIZE = 50;

export class DocumentEmbeddingService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const model: GenerativeModel = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const request: BatchEmbedContentsRequest = {
        requests: batch.map((text) => ({
          content: { parts: [{ text }], role: 'user' },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
        })),
      };

      const response = await model.batchEmbedContents(request);
      for (const embedding of response.embeddings) {
        results.push(embedding.values);
      }
    }

    return results;
  }
}
