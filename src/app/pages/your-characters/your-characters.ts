import { CharacterGridComponent } from './../../shared/components/character-grid.component/character-grid.component';
import { Component, signal, computed, OnInit } from '@angular/core';
import { ElementTypeName } from '../../../models/models';
import { sortCharacters } from '../../../utils/sorting-characters';
import { CHARACTERS_MOCK } from '../../../utils/characters.mock';
import { characterStore } from '../../store/character.store';

@Component({
  selector: 'app-your-characters',
  standalone: true,
  imports: [CharacterGridComponent],
  templateUrl: './your-characters.html',
  styleUrls: ['./your-characters.scss'],
})
export class YourCharacters implements OnInit {
  readonly elementTypes = [
    'pyro', 'hydro', 'electro', 'cryo', 'dendro', 'anemo', 'geo'
  ] as const;

  readonly characterStore = characterStore;

  readonly charactersPanelOpened = signal(false);
  readonly filtersWereUsed = signal(false);

  // Чи є хоча б один обраний персонаж
  readonly hasSelectedCharacters = computed(() =>
    characterStore.selectedCharacters().length > 0
  );

  readonly charactersArrayEmpty = computed(() =>
    characterStore.selectedCharacters().length === 0
  );

  // Чи потрібно показувати грид персонажів
  readonly shouldShowCharacterGrid = computed(() =>
    this.hasSelectedCharacters() || this.charactersPanelOpened()
  );

  // Персонажі для відображення
  readonly displayCharacters = computed(() => {
    if (this.charactersPanelOpened()) {
      return characterStore.allCharacters();
    }
    return sortCharacters(characterStore.selectedCharacters());
  });

  readonly shouldDimInactive = computed(() =>
    this.filtersWereUsed() && characterStore.activeElements().size > 0
  );

  ngOnInit(): void {
    if (characterStore.allCharacters().length === 0) {
      characterStore.setCharacters(sortCharacters(CHARACTERS_MOCK));
    }
    characterStore.loadFromLocalStorage();
  }

  toggleElement(type: ElementTypeName): void {
    this.filtersWereUsed.set(true);
    characterStore.toggleElement(type);
  }

  onAddCharacters(): void {
    this.charactersPanelOpened.set(true);
  }

  onSaveAddCharacters(): void {
    characterStore.saveToLocalStorage();
    this.charactersPanelOpened.set(false);
    // Не потрібно loadFromLocalStorage() — стор вже оновлений!
  }

  getElementIconPath(type: string): string {
    return `/assets/images/ElementType_${type}.png`;
  }
}
