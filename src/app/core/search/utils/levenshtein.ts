/**
 * Calculates the Levenshtein Distance (minimum edit distance) between two strings.
 * @param s1 The first string.
 * @param s2 The second string.
 * @returns The edit distance (number of insertions, deletions, or substitutions).
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Use a flat array or two rows to optimize memory and execution speed
  let prevRow = new Array<number>(len2 + 1);
  let currRow = new Array<number>(len2 + 1);

  for (let j = 0; j <= len2; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    currRow[0] = i;
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // Deletion
        currRow[j - 1] + 1,   // Insertion
        prevRow[j - 1] + cost // Substitution
      );
    }
    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[len2];
}

/**
 * Calculates a similarity score between two strings based on Levenshtein Distance.
 * @param s1 The first string.
 * @param s2 The second string.
 * @returns A value between 0.0 (no match) and 1.0 (exact match).
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1.0 - distance / maxLen;
}
