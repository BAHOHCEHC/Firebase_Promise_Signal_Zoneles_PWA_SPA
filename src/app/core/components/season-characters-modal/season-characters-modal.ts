import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character, ElementTypeName, Enemy } from '../../../../models/models';
import { sortCharacters } from '../../../../utils/sorting-characters';
import { CharacterStore } from '@store/_index';

@Component({
  selector: 'app-season-characters-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './season-characters-modal.html',
  styleUrl: './season-characters-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeasonCharactersModal {
  private characterStore = inject(CharacterStore);
  @Input() public title: string = 'Select this season Characters';
  @Input() public type: string = 'season';
  @Input() public specialGuest: Character[] = [];

  // Динамічні ліміти
  @Input() public min: number = 0;
  @Input() public max: number = 0;

  @Input() public allCharacters: Character[] = [];

  // Примусові фільтри (наприклад, з налаштувань сезону)
  @Input() public forcedElements: ElementTypeName[] = [];

  @Input() public set startSelection(value: Character[]) {
    this.currentSelection.set(new Set(value.map((c) => c.id)));
  }

  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<Character[]>();

  public readonly elementTypes: ElementTypeName[] = [
    'pyro',
    'hydro',
    'electro',
    'cryo',
    'dendro',
    'anemo',
    'geo',
  ];

  public activeElementFilters = signal<Set<ElementTypeName>>(new Set());
  public currentSelection = signal<Set<string>>(new Set());

  // Комп'ютед властивість для визначення, чи потрібно затемнювати неактивні фільтри
  public shouldDimInactiveFilters = computed(() => {
    const filtersCount = this.activeElementFilters().size;
    // Затемнюємо тільки якщо є хоча б один активний фільтр
    return filtersCount > 0;
  });

  // Комп'ютед властивість для визначення, чи потрібно затемнювати неактивних персонажів
  public shouldDimInactiveCharacters = computed(() => {
    const selectionCount = this.currentSelection().size;
    // Затемнюємо всіх персонажів, якщо є хоча б один обраний
    return selectionCount > 0;
  });

  public filteredCharacters = computed(() => {
    let filters = this.activeElementFilters();

    // Об'єднати з примусовими фільтрами, якщо вони є
    if (this.forcedElements.length > 0) {
      // Якщо фільтри користувача порожні, показувати тільки примусові? Або перетин?
      // Логіка: Користувач може вибирати підмножини примусових елементів, або якщо фільтр користувача відсутній, показати всі примусові.
      // Зазвичай forced означає "Дозволено тільки ці".
      // Припустимо, forcedElements обмежує пул.

      const forcedSet = new Set(this.forcedElements);
      if (filters.size === 0) {
        filters = forcedSet;
      } else {
        // Intersect
        const intersected = new Set<ElementTypeName>();
        for (const f of filters) {
          if (forcedSet.has(f)) intersected.add(f);
        }
        filters = intersected;
      }
    }

    if (filters.size === 0) {
      if (this.forcedElements.length > 0) {
        return sortCharacters(
          this.allCharacters.filter(
            (c) => c.element && this.forcedElements.includes(c.element.name),
          ),
        );
      }
      return sortCharacters(this.allCharacters);
    }
    return sortCharacters(
      this.allCharacters.filter((c) => c.element && c.element.name && filters.has(c.element.name)),
    );
  });

  public selectionCount = computed(() => this.currentSelection().size);

  public isSaveDisabled = computed(() => {
    if (this.type === 'lineup') {
      return this.selectionCount() < this.min;
    }
    return false;
  });

  public toggleElementFilter(type: ElementTypeName): void {
    // Якщо існують примусові елементи, дозволяти перемикати тільки їх?
    // Наразі просто дозволимо обчисленій властивості обробляти фактичну фільтрацію персонажів.
    const filters = new Set(this.activeElementFilters());
    if (filters.has(type)) {
      filters.delete(type);
    } else {
      filters.add(type);
    }
    this.activeElementFilters.set(filters);
  }

  public toggleCharacter(charId: string): void {
    const current = new Set(this.currentSelection());
    if (current.has(charId)) {
      current.delete(charId);
    } else {
      if (current.size < this.max) {
        current.add(charId);
      }
    }
    this.currentSelection.set(current);
  }

  public isCharacterSelected(charId: string): boolean {
    return this.currentSelection().has(charId);
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`;
  }

  public resolveAvatarUrl(item: string | Character | Enemy | null | undefined): string {
    if (!item) return 'assets/images/avatar_placeholder.png';

    // Пріоритет: 1. Прямий URL на об'єкті, 2. Пошук у мапі за ID
    if (typeof item !== 'string' && item.avatarUrl) {
      return item.avatarUrl;
    }

    const id = typeof item === 'string' ? item : item.id;

    return (
      this.charactersMap().get(id) ||
      'assets/images/avatar_placeholder.png'
    );
  }
  // --- Допоміжні методи ---
  private charactersMap = computed(
    () => new Map(this.characterStore.allCharacters().map((c) => [c.id, c.avatarUrl])),
  );

  public onSave(): void {
    const selectedIds = this.currentSelection();
    const charMap = new Map([
      ...this.allCharacters.map((c) => [c.id, c] as [string, Character]),
      ...this.specialGuest.map((c) => [c.id, c] as [string, Character]),
    ]);
    const selectedChars: Character[] = [];

    for (const id of selectedIds) {
      const char = charMap.get(id);
      if (char) {
        selectedChars.push(char);
      }
    }

    this.save.emit(selectedChars);
  }

  public onClose(): void {
    this.close.emit();
  }
}
