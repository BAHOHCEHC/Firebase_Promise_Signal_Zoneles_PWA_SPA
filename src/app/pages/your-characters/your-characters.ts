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

  readonly showCharacters = signal(false);
  readonly charactersPanelOpened = signal(false);
  readonly filtersWereUsed = signal(false);

  // Показывает true когда пользователь еще не выбирал персонажей
  readonly charactersArrayEmpty = computed(() =>
    characterStore.selectedCharacters().length === 0
  );

  // Показывает true когда панель открыта и в localStorage нет выбранных персонажей
  readonly localstorageUserCharactersEmpty = computed(() =>
    characterStore.selectedCharacters().length === 0
  );

  // Проверяет наличие UserCharacters в localStorage
  readonly hasUserCharactersInStorage = computed(() => {
    try {
      const stored = localStorage.getItem('UserCharacters');
      return stored !== null && stored !== '[]' && stored !== '';
    } catch {
      return false;
    }
  });

  // Массив персонажей для отображения
  readonly displayCharacters = computed(() => {
    if (this.charactersPanelOpened()) {
      // В режиме редактирования показываем всех персонажей
      return characterStore.allCharacters();
    } else {
      // В обычном режиме показываем только выбранных
      return characterStore.selectedCharacters();
    }
  });

  // Определяет, нужно ли затемнять неактивные кнопки
  readonly shouldDimInactive = computed(() =>
    this.filtersWereUsed() && characterStore.activeElements().size > 0
  );

  ngOnInit() {
    // Инициализируем список персонажей в store
    if (characterStore.allCharacters().length === 0) {
      characterStore.setCharacters(sortCharacters(CHARACTERS_MOCK));
    }
    // Загружаем сохраненных персонажей из localStorage
    characterStore.loadFromLocalStorage();
  }

  toggleElement(type: string) {
    this.filtersWereUsed.set(true);
    characterStore.toggleElement(type as ElementTypeName);
  }

  onAddCharacters() {
    this.showCharacters.set(true);
    this.charactersPanelOpened.set(true);
  }

  getElementIconPath(type: string) {
    return `/assets/images/ElementType_${type}.png`;
  }

  onSaveAddCharacters(): void {
    characterStore.saveToLocalStorage();
    // Перезагружаем данные из localStorage для обновления отображения
    characterStore.loadFromLocalStorage();
    // Закрываем панель после сохранения
    this.charactersPanelOpened.set(false);
    this.showCharacters.set(false);
  }


}


