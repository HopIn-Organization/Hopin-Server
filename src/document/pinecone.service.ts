import { Pinecone, Index } from '@pinecone-database/pinecone';

export interface PineconeChunkResult {
  text: string;
  score: number;
  documentId: number;
  chunkIndex: number;
  sourceFileName: string;
  jobId: number | null;
}

const UPSERT_BATCH_SIZE = 200;

export class PineconeService {
  private index: Index | null = null;
  private disabled = false;
  private namespaceOverride: string | null = null;

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME;
    this.namespaceOverride = process.env.PINECONE_NAMESPACE || null;

    if (!apiKey || !indexName) {
      console.warn('[Pinecone] PINECONE_API_KEY or PINECONE_INDEX_NAME not set — Pinecone disabled');
      this.disabled = true;
      return;
    }

    const client = new Pinecone({ apiKey });
    this.index = client.index(indexName);
  }

  private getNamespace(projectId: number): string {
    return this.namespaceOverride || `project-${projectId}`;
  }

  private buildVectorId(documentId: number, chunkIndex: number): string {
    return `chunk-${documentId}-${chunkIndex}`;
  }

  async upsertChunks(
    chunks: Array<{
      documentId: number;
      projectId: number;
      jobId: number | null;
      chunkIndex: number;
      text: string;
      sourceFileName: string;
      embedding: number[];
    }>,
    projectId: number,
  ): Promise<void> {
    if (this.disabled || !this.index || chunks.length === 0) return;

    try {
      const namespace = this.index.namespace(this.getNamespace(projectId));
      const records = chunks.map((chunk) => ({
        id: this.buildVectorId(chunk.documentId, chunk.chunkIndex),
        values: chunk.embedding,
        metadata: {
          documentId: chunk.documentId,
          projectId: chunk.projectId,
          jobId: chunk.jobId ?? -1, // store -1 for null (project-level docs)
          chunkIndex: chunk.chunkIndex,
          sourceFileName: chunk.sourceFileName,
          text: chunk.text,
        },
      }));

      // Batch upserts at UPSERT_BATCH_SIZE records per call
      for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
        const batch = records.slice(i, i + UPSERT_BATCH_SIZE);
        await namespace.upsert({ records: batch });
      }

      console.log(`[Pinecone] Upserted ${records.length} vectors for project ${projectId}`);
    } catch (error) {
      console.error('[Pinecone] Failed to upsert chunks:', error);
      // Do not rethrow — Pinecone failure must not crash extraction
    }
  }

  async queryChunks(
    queryEmbedding: number[],
    projectId: number,
    jobId: number | null,
    topK: number = 5,
  ): Promise<PineconeChunkResult[]> {
    if (this.disabled || !this.index) return [];

    try {
      const namespace = this.index.namespace(this.getNamespace(projectId));

      // Filter: match job-scoped chunks OR project-level chunks (jobId = -1)
      const filter =
        jobId !== null
          ? { jobId: { $in: [jobId, -1] } }
          : { projectId: { $eq: projectId } };

      const response = await namespace.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      return (response.matches ?? [])
        .filter((m) => m.metadata)
        .map((m) => ({
          text: String(m.metadata!.text ?? ''),
          score: m.score ?? 0,
          documentId: Number(m.metadata!.documentId),
          chunkIndex: Number(m.metadata!.chunkIndex),
          sourceFileName: String(m.metadata!.sourceFileName ?? ''),
          jobId: m.metadata!.jobId === -1 ? null : Number(m.metadata!.jobId),
        }));
    } catch (error) {
      console.error('[Pinecone] Failed to query chunks:', error);
      return [];
    }
  }

  async deleteChunksByDocumentId(vectorIds: string[], projectId: number): Promise<void> {
    if (this.disabled || !this.index || vectorIds.length === 0) return;

    try {
      const namespace = this.index.namespace(this.getNamespace(projectId));
      await namespace.deleteMany({ ids: vectorIds });
      console.log(`[Pinecone] Deleted ${vectorIds.length} vectors for project ${projectId}`);
    } catch (error) {
      console.error('[Pinecone] Failed to delete chunks:', error);
    }
  }

  isDisabled(): boolean {
    return this.disabled;
  }
}
