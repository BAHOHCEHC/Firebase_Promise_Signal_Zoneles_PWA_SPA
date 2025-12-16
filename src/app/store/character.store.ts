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

    return list.filter(c => elements.has(c.element.name));
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
}

export const characterStore = new CharacterStore();
