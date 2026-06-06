const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMS = 768;
const EMBEDDING_BASE_URL = 'https://generativelanguage.googleapis.com';
const BATCH_SIZE = 50;

interface BatchEmbedResponse {
  embeddings: Array<{ values: number[] }>;
}

export class DocumentEmbeddingService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.apiKey = apiKey;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const response = await fetch(
        `${EMBEDDING_BASE_URL}/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: batch.map((text) => ({
              model: `models/${EMBEDDING_MODEL}`,
              content: { parts: [{ text }] },
              taskType: 'RETRIEVAL_DOCUMENT',
              outputDimensionality: EMBEDDING_DIMS,
            })),
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          `Embedding API error ${response.status}: ${JSON.stringify(errorBody)}`,
        );
      }

      const data = (await response.json()) as BatchEmbedResponse;
      for (const embedding of data.embeddings) {
        results.push(embedding.values);
      }
    }

    return results;
  }
}
