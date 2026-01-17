import { CharacterGridComponent } from './../../shared/components/character-grid.component/character-grid.component';
import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { ElementTypeName } from '../../../models/models';
import { sortCharacters } from '../../../utils/sorting-characters';
// import { CHARACTERS_MOCK } from '../../../utils/characters.mock';
import { characterStore } from '../../store/character.store';
import { CharacterService } from '../../shared/services/charater.service';

@Component({
  selector: 'app-your-characters',
  standalone: true,
  imports: [CharacterGridComponent],
  templateUrl: './your-characters.html',
  styleUrls: ['./your-characters.scss'],
})
export class YourCharacters implements OnInit {
  private characterService = inject(CharacterService);
  public isLoading = signal(true);

  readonly elementTypes = [
    'pyro', 'hydro', 'electro', 'cryo', 'dendro', 'anemo', 'geo'
  ] as const;

  readonly characterStore = characterStore;

  readonly charactersPanelOpened = signal(false);
  readonly filtersWereUsed = signal(false);

  readonly hasSelectedCharacters = computed(() =>
    characterStore.selectedCharacters().length > 0
  );

  readonly charactersArrayEmpty = computed(() =>
    characterStore.selectedCharacters().length === 0
  );

  readonly shouldShowCharacterGrid = computed(() =>
    this.hasSelectedCharacters() || this.charactersPanelOpened()
  );

  readonly displayCharacters = computed(() => {
    if (this.charactersPanelOpened()) {
      return characterStore.allCharacters();
    }
    return sortCharacters(characterStore.selectedCharacters());
  });

  readonly shouldDimInactive = computed(() =>
    this.filtersWereUsed() && characterStore.activeElements().size > 0
  );

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    // ❌ стара mock-логіка
    /*
    if (characterStore.allCharacters().length === 0) {
      characterStore.setCharacters(sortCharacters(CHARACTERS_MOCK));
    }
    */

    // ✅ нова логіка: Firestore → Store
    if (characterStore.allCharacters().length === 0) {
      const characters = await this.characterService.getAllCharacters();
      characterStore.setCharacters(sortCharacters(characters));
    }

    // localStorage — як і було
    characterStore.loadFromLocalStorage();
    this.isLoading.set(false);
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
  }

  getElementIconPath(type: string): string {
    return `/assets/images/ElementType_${type}.png`;
  }
}
