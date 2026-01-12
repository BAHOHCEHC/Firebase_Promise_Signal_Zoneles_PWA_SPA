/**
 * Generates a UUID (Universally Unique Identifier).
 * Uses crypto.randomUUID() if available (modern browsers, Node.js).
 * Falls back to crypto.getRandomValues() or Math.random() implementation (RFC4122 v4).
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available (Modern browsers, Node 14.17+)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // Fallback implementation compliant with RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // secure random values if available
    let r: number;
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const arr = new Uint8Array(1);
      crypto.getRandomValues(arr);
      r = (arr[0] % 16);
    } else {
      // less secure fallback using Math.random
      r = Math.random() * 16 | 0;
    }

    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
