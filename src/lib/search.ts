import chunksData from "@/data/chunks.json";

interface Chunk {
  text: string;
  source: string;
}

const chunks: Chunk[] = chunksData as Chunk[];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[　\s]+/g, " ")
    .split(/[\s、。！？,.!?]+/)
    .filter((t) => t.length > 1);
}

export function search(query: string, topK = 5): Chunk[] {
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    const matches = queryTokens.filter((qt) =>
      chunkTokens.some((ct) => ct.includes(qt) || qt.includes(ct))
    );
    return { chunk, score: matches.length };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}
