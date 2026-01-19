import {
  Component,
  computed,
  Input,
  Signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character, ElementTypeName } from '@models/models';
import { CharacterStore } from '@store/_index';

@Component({
  standalone: true,
  selector: 'app-character-grid',
  imports: [CommonModule],
  templateUrl: './character-grid.html',
  styleUrl: './character-grid.scss',
})
export class CharacterGridComponent {
  protected readonly characterStore = inject(CharacterStore);

  /** Вхідні дані */
  @Input({ required: true }) characters!: Signal<Character[]>;
  @Input() activeElements!: Signal<Set<ElementTypeName>>;

  /** ФІЛЬТРАЦІЯ ПІСЛЯ РЕНДЕРА */
  readonly visibleCharacters = computed(() => {
    const chars = this.characters();
    const filters = this.activeElements();

    if (!filters || filters.size === 0) return chars;

    return chars.filter(c => c.element && filters.has(c.element.name));
  });

  readonly hasSelection = computed(() => this.characterStore.hasSelection());

  now = Date.now();

  toggle(char: Character) {
    this.characterStore.toggleCharacter(char);
  }

  isSelected(char: Character) {
    return this.characterStore.isSelected(char);
  }
}
