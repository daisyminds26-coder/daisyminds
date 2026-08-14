/** Fisher-Yates — used once at attempt creation to persist question/option order (never reshuffled on subsequent reads). Not cryptographically seeded: nothing security-sensitive depends on the shuffle being unpredictable, only on it being decided once and then frozen. */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i] as T
    result[i] = result[j] as T
    result[j] = temp
  }
  return result
}
