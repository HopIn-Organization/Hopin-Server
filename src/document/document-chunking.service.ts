const CHUNK_MAX_CHARS = 1500;
const MIN_CHUNK_CHARS = 30;

export interface ChunkInput {
  documentId: number;
  projectId: number;
  jobId: number | null;
  chunkIndex: number;
  text: string;
  sourceFileName: string;
}

export class DocumentChunkingService {
  chunkText(
    text: string,
    documentId: number,
    projectId: number,
    jobId: number | null,
    sourceFileName: string,
  ): ChunkInput[] {
    if (!text || !text.trim()) {
      return [];
    }

    const paragraphs = text.split(/\n\n/);
    const chunks: string[] = [];
    let current = '';
    let overlap = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      // Paragraph itself exceeds max — split by sentence boundary
      if (trimmed.length > CHUNK_MAX_CHARS) {
        // Flush any accumulated current chunk first
        if (current.trim().length >= MIN_CHUNK_CHARS) {
          chunks.push(current.trim());
        }

        const sentences = trimmed.split(/(?<=[.!?])\s+/);
        // Seed with overlap carried from previous paragraph group
        let sentenceChunk = overlap;

        for (const sentence of sentences) {
          const candidate = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
          if (candidate.length > CHUNK_MAX_CHARS && sentenceChunk.trim()) {
            if (sentenceChunk.trim().length >= MIN_CHUNK_CHARS) {
              chunks.push(sentenceChunk.trim());
            }
            // Keep last sentence as overlap
            sentenceChunk = sentence;
          } else {
            sentenceChunk = candidate;
          }
        }

        if (sentenceChunk.trim().length >= MIN_CHUNK_CHARS) {
          chunks.push(sentenceChunk.trim());
          overlap = sentenceChunk.trim();
        } else {
          overlap = '';
        }
        // Seed current with the trailing overlap so the next normal paragraph
        // is connected to this group's last sentence.
        current = overlap;
        continue;
      }

      // Normal paragraph — check if adding it would exceed max
      const candidate = current ? current + '\n\n' + trimmed : trimmed;

      if (candidate.length > CHUNK_MAX_CHARS && current.trim()) {
        // Close current chunk
        if (current.trim().length >= MIN_CHUNK_CHARS) {
          chunks.push(current.trim());
        }
        // Last paragraph becomes overlap for next chunk; prefer sentence-split
        // overlap when set, otherwise derive from the last paragraph in current.
        const lastParagraph = overlap || (current.split(/\n\n/).pop()?.trim() ?? '');
        overlap = lastParagraph;
        current = lastParagraph ? lastParagraph + '\n\n' + trimmed : trimmed;
      } else {
        current = candidate;
        // Clear sentence-split overlap once we have resumed normal accumulation.
        overlap = '';
      }
    }

    // Flush remaining
    if (current.trim().length >= MIN_CHUNK_CHARS) {
      chunks.push(current.trim());
    }

    return chunks.map((chunkText, chunkIndex) => ({
      documentId,
      projectId,
      jobId,
      chunkIndex,
      text: chunkText,
      sourceFileName,
    }));
  }
}
