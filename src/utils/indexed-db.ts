export class IndexedDbUtil {
  private static readonly DB_NAME = 'GiSimulatorCache';
  private static readonly VERSION = 1;
  private static readonly STORE_NAME = 'cache';
  private static readonly MAX_ITEMS = 200; // макс кількість кешованих картинок

  /** Відкриває IndexedDB */
  private static open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Зберегти будь-які дані */
  static async set(key: string, value: any): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Отримати дані */
  static async get<T>(key: string): Promise<T | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Видалити ключ */
  static async delete(key: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Отримати всі ключі */
  private static async getAllKeys(): Promise<string[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  /** ===============================
   * Методи для кешування Base64 картинок
   * =============================== */

  /** Завантажити картинку і зберегти в IndexedDB як Base64 */
  static async loadImageAndCache(url: string, key: string): Promise<string> {
    // Перевірка кешу
    const cached = await this.get<string>(key);
    if (cached) return cached;

    // Завантаження картинки
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise<string>((resolve, reject) => {
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await this.set(key, base64); // кешуємо
          await this.cleanupOldCache(); // перевіряємо розмір кешу
          resolve(base64);
        } catch (e) {
          console.error('Failed to cache image in IndexedDB', e);
          resolve(base64); // повертаємо навіть якщо кеш не вдалось
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  /** Отримати картинку з кешу або null */
  static async getCachedImage(key: string): Promise<string | null> {
    return await this.get<string>(key);
  }

  /** ===============================
   * Очистка старого кешу (якщо більше MAX_ITEMS)
   * =============================== */
  private static async cleanupOldCache(): Promise<void> {
    const keys = await this.getAllKeys();
    if (keys.length <= this.MAX_ITEMS) return;

    // Видаляємо найстаріші ключі (перші у списку)
    const db = await this.open();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    const removeCount = keys.length - this.MAX_ITEMS;
    for (let i = 0; i < removeCount; i++) {
      store.delete(keys[i]);
    }
  }
}
