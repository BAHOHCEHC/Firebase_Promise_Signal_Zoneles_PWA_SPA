import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  OnInit
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CharacterService } from '../../../shared/services/charater.service';
import { characterStore } from '../../../store/character.store';
import { Character, ElementTypeName } from '../../../../models/models';
import { RARITY } from '../../../../utils/characters.mock';

@Component({
  standalone: true,
  selector: 'app-character-form-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './character-form-modal.html',
  styleUrls: ['./character-form-modal.scss'],
})
export class CharacterFormModal implements OnInit {
  @Input() character?: Character; // Якщо передано — редагуємо, інакше — створюємо
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(CharacterService);

  readonly elementTypes: ElementTypeName[] = [
    'pyro', 'hydro', 'electro', 'cryo', 'dendro', 'anemo', 'geo'
  ];

  readonly selectedElement = signal<ElementTypeName>('pyro');
  readonly previewImage = signal<string | null>(null);
  readonly selectedRarity = signal(RARITY.legendary);

  readonly canDelete = computed(() => !!this.character);
  readonly isEditMode = computed(() => !!this.character);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    if (this.character) {
      this.form.patchValue({ name: this.character.name });
      this.selectedElement.set(this.character.element?.name ?? 'pyro');
      this.selectedRarity.set(this.character.rarity);
      this.previewImage.set(this.character.avatarUrl);
    }
  }

  selectElement(el: ElementTypeName): void {
    this.selectedElement.set(el);
  }

  selectRarity(key: 'legendary' | 'epic'): void {
    this.selectedRarity.set(RARITY[key]);
  }

  onImagePick(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => this.previewImage.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  // async save(): Promise<void> {
  //   if (this.form.invalid) return;

  //   const characterData: Character = {
  //     id: this.character?.id ?? Date.now(), // Якщо редагуємо — зберігаємо старий id
  //     name: this.form.value.name!,
  //     avatarUrl: this.previewImage() ?? this.character?.avatarUrl ?? '',
  //     rarity: this.selectedRarity(),
  //     element: { name: this.selectedElement() },
  //     energy: 2,
  //     newIndex: { value: this.character?.id ?? Date.now(), expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }
  //   };

  //   try {
  //     if (this.isEditMode()) {
  //       // Оновлюємо існуючого
  //       await this.service.update(characterData);
  //       characterStore.updateCharacter(characterData);
  //     } else {
  //       // Створюємо нового (id вже згенеровано вище)
  //       await this.service.create(characterData);
  //       characterStore.addCharacter(characterData);
  //     }

  //     this.close.emit();
  //   } catch (error) {
  //     console.error('Error saving character:', error);
  //     alert('Помилка збереження персонажа');
  //   }
  // }
  async save(): Promise<void> {
  if (this.form.invalid) return;

  const characterData: Omit<Character, 'id'> = {
    name: this.form.value.name!,
    avatarUrl: this.previewImage() ?? this.character?.avatarUrl ?? '',
    rarity: this.selectedRarity(),
    element: { name: this.selectedElement() },
    energy: 2,
    newIndex: {
      value: this.character?.newIndex?.value ?? Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    }
  };

  try {
    let savedCharacter: Character;

    if (this.isEditMode()) {
      // Редагуємо — оновлюємо з існуючим ID
      savedCharacter = { ...characterData, id: this.character!.id };
      await this.service.update(savedCharacter);
    } else {
      // Створюємо — отримуємо новий персонаж з реальним ID від Firestore

      await this.service.create(characterData);
    }

    // Оновлюємо стор
    // if (this.isEditMode()) {
    //   characterStore.updateCharacter(savedCharacter);
    // } else {
    //   characterStore.addCharacter(savedCharacter);
    // }

    this.close.emit();
  } catch (error) {
    console.error('Error saving character:', error);
    alert('Помилка збереження');
  }
}

  async delete(): Promise<void> {
    if (!this.character) return;
    try {
      await this.service.delete(String(this.character.id));
      characterStore.removeCharacter(String(this.character.id));

      this.close.emit();
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Помилка видалення');
    }
  }
}
