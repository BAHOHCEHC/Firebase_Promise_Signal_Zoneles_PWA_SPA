import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CharacterFormModal } from '@core/components/_index';
import { CharacterService } from '@shared/services/_index';
import { CharacterStore } from '@store/_index';
import { Character } from '@models/models';
import { sortCharacters } from '@utils/sorting-characters';

@Component({
  standalone: true,
  selector: 'app-character-list-editor',
  imports: [CommonModule, CharacterFormModal],
  templateUrl: './character-list-editor.html',
  styleUrl: './character-list-editor.scss',
})
export class CharacterListEditor {
  private service = inject(CharacterService);
  public readonly characterStore = inject(CharacterStore);

  readonly isModalOpen = signal(false);

  public selectedCharacter = signal<Character | null>(null);
  public isLoading = signal(true);

  readonly now = Date.now();

  // Список персонажів для відображення (з стора)
  readonly visibleCharacters = this.characterStore.allCharacters;

  constructor() {
    // Завантажуємо персонажів при старті
    this.loadCharacters();

    // Автоматичне оновлення при закритті модалки (через close.emit())
    effect(() => {
      if (!this.isModalOpen()) {
        this.loadCharacters(); // оновлюємо список після закриття модалки
      }
    });
  }

  async loadCharacters(): Promise<void> {
    try {
      const chars = await this.service.getAllCharacters();
      this.characterStore.setCharacters(sortCharacters(chars));
    } catch (error) {
      console.error('Error loading characters:', error);
    }

    this.isLoading.set(false);
  }

  toggle(character: Character) {
    this.selectedCharacter.set(character);
    this.open();
  }

  open(): void {
    this.isModalOpen.set(true);
  }

  close(): void {
    this.selectedCharacter.set(null);
    this.isModalOpen.set(false);
  }
}
