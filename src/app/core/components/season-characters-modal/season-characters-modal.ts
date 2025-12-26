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

  public shouldDimCharacter(charId: string): boolean {
    // If limit reached and not selected, dim it
    // Or if filtered out? (filtered out are not shown)
    // "they behave like... as soon as first selected all darken and only active highlight" ->
    // Wait, prompt says: "as soon as first char selected all darken and only active highlight" (See image 4_2.png)
    // Actually, usually "dim inactive" means if limit reached, others are disabled.
    // The prompt says: "characters can be clicked as soon as first character selected all darken and only active highlight".
    // This sounds like a specific visual style where unselected items are dimmed if there is ANY selection? Or maybe just selected ones are bright.
    // I'll stick to standard: highlight selected, dim if limit reached and not selected.
    return !this.isCharacterSelected(charId) && this.selectionCount() >= this.limit;
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`; // Assuming path
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
