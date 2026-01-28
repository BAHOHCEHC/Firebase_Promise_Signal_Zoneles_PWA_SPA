/**
 * Генерує UUID (Універсально Унікальний Ідентифікатор).
 * Використовує crypto.randomUUID(), якщо доступно (сучасні браузери, Node.js).
 * Використовує запасний варіант crypto.getRandomValues() або Math.random() (RFC4122 v4).
 */
export function generateUUID(): string {
  // Перевірка доступності crypto.randomUUID (Сучасні браузери, Node 14.17+)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // Резервна реалізація, сумісна з RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // безпечні випадкові значення, якщо доступні
    let r: number;
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const arr = new Uint8Array(1);
      crypto.getRandomValues(arr);
      r = (arr[0] % 16);
    } else {
      // менш безпечний запасний варіант з використанням Math.random
      r = Math.random() * 16 | 0;
    }

    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
