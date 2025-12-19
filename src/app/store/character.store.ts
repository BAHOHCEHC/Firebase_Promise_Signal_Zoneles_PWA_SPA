import { signal, computed } from '@angular/core';
import { Character, ElementTypeName } from '../../models/models';


class CharacterStore {
  /** Всі персонажі (повний список, 1 раз) */
  readonly allCharacters = signal<Character[]>([]);

  /** Активні фільтри елементів */
  readonly activeElements = signal<Set<ElementTypeName>>(new Set());

  /** Обрані персонажі */
  readonly selectedCharacters = signal<Character[]>([]);

  /** Є хоча б один обраний */
  readonly hasSelection = computed(
    () => this.selectedCharacters().length > 0
  );

  /** Відфільтрований список */
  readonly filteredCharacters = computed(() => {
    const elements = this.activeElements();
    const list = this.allCharacters();

    if (elements.size === 0) return list;

    return list.filter(c => c.element && elements.has(c.element.name));
  });

  /** Сохранить выбранных персонажей в localStorage */
  saveToLocalStorage() {
    localStorage.setItem(
      'UserCharacters',
      JSON.stringify(this.selectedCharacters())
    );
  }

  /** Загрузить выбранных персонажей из localStorage */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('UserCharacters');
      if (stored) {
        const chars = JSON.parse(stored) as Character[];
        this.selectedCharacters.set(chars);
      }
    } catch (e) {
      console.error('Failed to load characters from localStorage', e);
    }
  }

  setCharacters(chars: Character[]) {
    this.allCharacters.set(chars);
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
    const exists = this.selectedCharacters().some(c => c.id === char.id);
    this.selectedCharacters.set(
      exists
        ? this.selectedCharacters().filter(c => c.id !== char.id)
        : [...this.selectedCharacters(), char]
    );
  }

  isSelected(char: Character) {
    return this.selectedCharacters().some(c => c.id === char.id);
  }

  /** Додати нового персонажа */
  addCharacter(char: Character) {
    this.allCharacters.set([...this.allCharacters(), char]);
  }

  /** Видалити персонажа за id */
  removeCharacter(id: string) {
    this.allCharacters.set(
      this.allCharacters().filter(c => c.id !== id)
    );

    // Також видаляємо з обраних, якщо був
    this.selectedCharacters.set(
      this.selectedCharacters().filter(c => c.id !== id)
    );
  }

  /** ОНОВИТИ існуючого персонажа */
  updateCharacter(updatedChar: Character) {
    if (!updatedChar.id) {
      console.warn('Cannot update character without id');
      return;
    }

    this.allCharacters.set(
      this.allCharacters().map(c =>
        c.id === updatedChar.id ? updatedChar : c
      )
    );

    // Якщо персонаж був у обраних — оновлюємо і там
    const selected = this.selectedCharacters();
    const index = selected.findIndex(c => c.id === updatedChar.id);
    if (index !== -1) {
      const newSelected = [...selected];
      newSelected[index] = updatedChar;
      this.selectedCharacters.set(newSelected);
    }
  }
}

export const characterStore = new CharacterStore();
