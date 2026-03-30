/**
 * Computes cosine similarity between two vectors.
 */
export function cosineSimilarity(vec1: Record<string, number>, vec2: Record<string, number>): number {
  const intersection = Object.keys(vec1).filter(key => key in vec2);
  
  let dotProduct = 0;
  for (const key of intersection) {
    dotProduct += vec1[key] * vec2[key];
  }

  let mag1 = 0;
  for (const key in vec1) {
    mag1 += vec1[key] * vec1[key];
  }
  mag1 = Math.sqrt(mag1);

  let mag2 = 0;
  for (const key in vec2) {
    mag2 += vec2[key] * vec2[key];
  }
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;
  
  return dotProduct / (mag1 * mag2);
}

/**
 * Ranks candidates based on similarity scores.
 */
export function rankCandidates(scores: { fileName: string; score: number }[]) {
  return [...scores].sort((a, b) => b.score - a.score);
}
