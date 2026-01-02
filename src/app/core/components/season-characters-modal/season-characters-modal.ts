import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character, ElementTypeName } from '../../../../models/models';

@Component({
  selector: 'app-season-characters-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './season-characters-modal.html',
  styleUrl: './season-characters-modal.scss'
})
export class SeasonCharactersModal {
  @Input() public title: string = 'Select this season Characters';
  @Input() public limit: number = 6;
  @Input() public allCharacters: Character[] = [];
  @Input() public set startSelection(value: Character[]) {
    this.currentSelection.set(new Set(value.map(c => c.id)));
  }

  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<Character[]>();

  public readonly elementTypes: ElementTypeName[] = [
    "pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"
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
    const filters = this.activeElementFilters();
    if (filters.size === 0) {
      return this.allCharacters;
    }
    return this.allCharacters.filter(c => c.element && c.element.name && filters.has(c.element.name));
  });

  public selectionCount = computed(() => this.currentSelection().size);

  public toggleElementFilter(type: ElementTypeName): void {
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
      if (current.size < this.limit) {
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

  public onSave(): void {
    const selectedIds = this.currentSelection();
    const selectedChars = this.allCharacters.filter(c => selectedIds.has(c.id));
    this.save.emit(selectedChars);
  }

  public onClose(): void {
    this.close.emit();
  }
}
