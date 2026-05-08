import { ModelId, ConsensusResult } from '@/types'

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

function combinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (arr.length < size) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, size - 1).map(c => [first, ...c]),
    ...combinations(rest, size),
  ]
}

export function computeConsensus(
  modelIds: ModelId[],
  embeddings: number[][],
  threshold = parseFloat(process.env.CONSENSUS_SIMILARITY_THRESHOLD ?? '0.85')
): ConsensusResult {
  const n = modelIds.length
  const matrix: Record<string, Record<string, number>> = {}

  for (let i = 0; i < n; i++) {
    matrix[modelIds[i]] = {}
    for (let j = 0; j < n; j++) {
      matrix[modelIds[i]][modelIds[j]] =
        i === j ? 1 : cosineSimilarity(embeddings[i], embeddings[j])
    }
  }

  // Find the largest group where all pairs are above the similarity threshold
  let bestCluster: ModelId[] = []
  for (let size = n; size >= 1; size--) {
    if (bestCluster.length >= size) break
    for (const combo of combinations(modelIds, size)) {
      const allAgree = combo.every((a, i) =>
        combo.every((b, j) => i === j || matrix[a][b] >= threshold)
      )
      if (allAgree) { bestCluster = combo; break }
    }
    if (bestCluster.length === size) break
  }

  const outlierModels = modelIds.filter(id => !bestCluster.includes(id))

  let totalSim = 0, count = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalSim += matrix[modelIds[i]][modelIds[j]]
      count++
    }
  }

  return {
    consensusReached: bestCluster.length >= Math.ceil(n / 2),
    agreementPct: count > 0 ? (totalSim / count) * 100 : 100,
    largestClusterModels: bestCluster,
    outlierModels,
    similarityMatrix: matrix,
    totalModels: n,
    respondedModels: n,
  }
}
