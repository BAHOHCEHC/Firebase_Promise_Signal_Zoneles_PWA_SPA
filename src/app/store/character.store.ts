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
  }

  /** Сохранить список всех персонажей в IndexedDB */
  private async saveAllCharactersToIndexedDb() {
    try {
      await IndexedDbUtil.set('AllCharacters', this.allCharacters());
    } catch (e) {
      console.error('Failed to save all characters to IndexedDB', e);
    }
  }

  /** Загрузить список всех персонажей из IndexedDB */
  private async loadAllCharactersFromIndexedDb() {
    try {
      const chars = await IndexedDbUtil.get<Character[]>('AllCharacters');
      if (chars && Array.isArray(chars)) {
        this.allCharacters.set(chars);
        // Гидрация выбранных персонажей, если они были загружены ранее как IDs
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

  /** Сохранить выбранных персонажей в localStorage */
  saveToLocalStorage() {
    const ids = this.selectedCharacters().map((c) => c.id);
    localStorage.setItem('UserCharacters', JSON.stringify(ids));
  }

  /** Загрузить выбранных персонажей из localStorage */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('UserCharacters');
      if (stored) {
        // Try parsing as IDs first (new format)
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
              // Якщо персонажі ще не завантажені, тимчасово зберігаємо IDs?
              // Або просто нічого не робимо, бо setCharacters викличеться пізніше?
              // Найкраще: реактивно оновлювати selectedCharacters коли allCharacters змінюється,
              // але тут ми просто завантажимо IDs в тимчасову змінну або просто спробуємо ще раз пізніше.
              // АЛЕ! Оскільки allCharacters це сигнал, ми можемо використати computed?
              // Ні, selectedCharacters це writable signal.
              // Варіант: зберегти IDs і спробувати відновити пізніше.
              this._pendingSelectedIds = parsed;
            }
          } else {
            // Old format (array of objects), migrate or use as is
            // Assuming it's objects, just set them (but IDs are smaller).
            // Better to rely on fresh data from allCharacters to ensure updates.
            const ids = new Set(parsed.map((c: any) => c.id));
            // Store as pending so setCharacters can hydrate them
            this._pendingSelectedIds = Array.from(ids) as string[];
          }
        }
      }
    } catch (e) {
      console.error('Failed to load characters from localStorage', e);
    }
  }

  private _pendingSelectedIds: string[] = [];

  setCharacters(chars: Character[]) {
    this.allCharacters.set(chars);
    this.saveAllCharactersToIndexedDb();
    // Rehydrate if we have pending IDs
    this.rehydrateSelectedCharacters(chars);
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
  addCharacter(char: Character) {
    this.allCharacters.set([...this.allCharacters(), char]);
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
  updateCharacter(updatedChar: Character) {
    if (!updatedChar.id) {
      console.warn('Cannot update character without id');
      return;
    }

    this.allCharacters.set(
      this.allCharacters().map((c) => (c.id === updatedChar.id ? updatedChar : c)),
    );
    this.saveAllCharactersToIndexedDb();

    // Якщо персонаж був у обраних — оновлюємо і там
    const selected = this.selectedCharacters();
    const index = selected.findIndex((c) => c.id === updatedChar.id);
    if (index !== -1) {
      const newSelected = [...selected];
      newSelected[index] = updatedChar;
      this.selectedCharacters.set(newSelected);
      this.saveToLocalStorage();
    }
  }
}
