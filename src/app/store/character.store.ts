import { signal, computed, Injectable } from '@angular/core';
import { Character, ElementTypeName } from '@models/models';
import { IndexedDbUtil } from '@utils/indexed-db';

@Injectable({
  providedIn: 'root',
})
export class CharacterStore {
  /** Всі персонажі (повний список, 1 раз) */
  readonly allCharacters = signal<Character[]>([]);

  /** Активні фільтри елементів */
  readonly activeElements = signal<Set<ElementTypeName>>(new Set());

  /** Обрані персонажі */
  readonly selectedCharacters = signal<Character[]>([]);

  /** Є хоча б один обраний */
  readonly hasSelection = computed(() => this.selectedCharacters().length > 0);

  /** Відфільтрований список */
  readonly filteredCharacters = computed(() => {
    const elements = this.activeElements();
    const list = this.allCharacters();

    if (elements.size === 0) return list;

    return list.filter((c) => c.element && elements.has(c.element.name));
  });

  constructor() {
    this.loadFromLocalStorage();
    this.loadAllCharactersFromIndexedDb();
    // Periodically cleanup cache
    this.cleanupCache();
  }

  private async cleanupCache() {
    try {
      if ('cleanupOldCache' in IndexedDbUtil) {
         // Assuming side-effect or trusting loadImageAndCache
      }
    } catch (e) {
      console.error(e);
    }
  }

  /** Обробка персонажів для кешування зображень та оновлення URL у base64 */
  private async processCharacterImages(chars: Character[]): Promise<Character[]> {
    const processed = await Promise.all(chars.map(async (char) => {
      const c = { ...char };

      // Аватар
      if (c.avatarUrl && !c.avatarUrl.startsWith('data:')) {
         try {
           c.avatarUrl = await IndexedDbUtil.loadImageAndCache(c.avatarUrl, c.avatarUrl);
         } catch (e) {
           console.error(`Failed to cache avatar for ${c.name}`, e);
         }
      }

      // Іконка елемента
      if (c.element?.iconUrl && !c.element.iconUrl.startsWith('data:')) {
        try {
           const newUrl = await IndexedDbUtil.loadImageAndCache(c.element.iconUrl, c.element.iconUrl);
           c.element = { ...c.element, iconUrl: newUrl };
        } catch (e) {
             console.error(`Failed to cache element icon for ${c.name}`, e);
        }
      }

       // Фон рідкісності
      if (c.rarity?.bgUrl && !c.rarity.bgUrl.startsWith('data:')) {
        try {
           const newUrl = await IndexedDbUtil.loadImageAndCache(c.rarity.bgUrl, c.rarity.bgUrl);
           c.rarity = { ...c.rarity, bgUrl: newUrl };
        } catch (e) {
             console.error(`Failed to cache rarity bg for ${c.name}`, e);
        }
      }

      return c;
    }));
    return processed;
  }

  /** Зберегти список всіх персонажів в IndexedDB */
  private async saveAllCharactersToIndexedDb() {
    try {
      await IndexedDbUtil.set('AllCharacters', this.allCharacters());
    } catch (e) {
      console.error('Failed to save all characters to IndexedDB', e);
    }
  }

  /** Завантажити список всіх персонажів з IndexedDB */
  private async loadAllCharactersFromIndexedDb() {
    try {
      const chars = await IndexedDbUtil.get<Character[]>('AllCharacters');
      if (chars && Array.isArray(chars)) {
        this.allCharacters.set(chars);
        // Гідратація обраних персонажів, якщо вони були завантажені раніше як ID
        this.rehydrateSelectedCharacters(chars);
      }
    } catch (e) {
      console.error('Failed to load all characters from IndexedDB', e);
    }
  }

  private rehydrateSelectedCharacters(chars: Character[]) {
    if (this._pendingSelectedIds.length > 0) {
      const ids = new Set(this._pendingSelectedIds);
      const selected = chars.filter((c) => ids.has(c.id));
      this.selectedCharacters.set(selected);
      this._pendingSelectedIds = [];
    }
  }

  /** Зберегти обраних персонажів у localStorage */
  saveToLocalStorage() {
    const ids = this.selectedCharacters().map((c) => c.id);
    localStorage.setItem('UserCharacters', JSON.stringify(ids));
  }

  /** Завантажити обраних персонажів з localStorage */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('UserCharacters');
      if (stored) {
        // Спробувати спочатку розпарсити як IDs (новий формат)
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          // Якщо це масив рядків (IDs)
          if (typeof parsed[0] === 'string') {
            const all = this.allCharacters();
            if (all.length > 0) {
              const ids = new Set(parsed);
              const chars = all.filter((c) => ids.has(c.id));
              this.selectedCharacters.set(chars);
            } else {
              this._pendingSelectedIds = parsed;
            }
          } else {
            // Старий формат
            const ids = new Set(parsed.map((c: any) => c.id));
            this._pendingSelectedIds = Array.from(ids) as string[];
          }
        }
      }
    } catch (e) {
      console.error('Failed to load characters from localStorage', e);
    }
  }

  private _pendingSelectedIds: string[] = [];

  async setCharacters(chars: Character[]) {
    // Кешувати зображення перед встановленням
    const processed = await this.processCharacterImages(chars);
    this.allCharacters.set(processed);
    this.saveAllCharactersToIndexedDb();
    // Регідратація, якщо є очікувані ID
    this.rehydrateSelectedCharacters(processed);
  }

  toggleElement(type: ElementTypeName) {
    const next = new Set(this.activeElements());
    next.has(type) ? next.delete(type) : next.add(type);
    this.activeElements.set(next);
  }

  clearFilters() {
    this.activeElements.set(new Set());
  }

  toggleCharacter(char: Character) {
    const exists = this.selectedCharacters().some((c) => c.id === char.id);
    this.selectedCharacters.set(
      exists
        ? this.selectedCharacters().filter((c) => c.id !== char.id)
        : [...this.selectedCharacters(), char],
    );
  }

  isSelected(char: Character) {
    return this.selectedCharacters().some((c) => c.id === char.id);
  }

  /** Додати нового персонажа */
  async addCharacter(char: Character) {
    const [processed] = await this.processCharacterImages([char]);
    this.allCharacters.set([...this.allCharacters(), processed]);
    this.saveAllCharactersToIndexedDb();
  }

  /** Видалити персонажа за id */
  removeCharacter(id: string) {
    this.allCharacters.set(this.allCharacters().filter((c) => c.id !== id));
    this.saveAllCharactersToIndexedDb();

    // Також видаляємо з обраних, якщо був
    this.selectedCharacters.set(this.selectedCharacters().filter((c) => c.id !== id));
    this.saveToLocalStorage();
  }

  /** ОНОВИТИ існуючого персонажа */
  async updateCharacter(updatedChar: Character) {
    if (!updatedChar.id) {
      console.warn('Cannot update character without id');
      return;
    }

    const [processed] = await this.processCharacterImages([updatedChar]);

    this.allCharacters.set(
      this.allCharacters().map((c) => (c.id === processed.id ? processed : c)),
    );
    this.saveAllCharactersToIndexedDb();

    // Якщо персонаж був у обраних — оновлюємо і там
    const selected = this.selectedCharacters();
    const index = selected.findIndex((c) => c.id === processed.id);
    if (index !== -1) {
      const newSelected = [...selected];
      newSelected[index] = processed;
      this.selectedCharacters.set(newSelected);
      this.saveToLocalStorage();
    }
  }
}
