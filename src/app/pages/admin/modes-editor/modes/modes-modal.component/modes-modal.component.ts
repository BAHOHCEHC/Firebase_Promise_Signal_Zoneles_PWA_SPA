// import { Component, EventEmitter, inject, Input, OnInit, Output, signal, computed } from '@angular/core';
// import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Act, Mode, Fight_type } from '../../../../../../models/models';
// import { actModesStore } from '../../../../../store/act-modes.store';
// import { CommonModule } from '@angular/common';
// import { ActModsService } from '../../../../../shared/services/act-mods.service';

// @Component({
//   selector: 'app-mode-modal',
//   standalone: true,
//   imports: [ReactiveFormsModule, CommonModule],
//   templateUrl: './modes-modal.component.html',
//   styleUrl: './modes-modal.component.scss'
// })
// export class ModeModalComponent implements OnInit {
//   @Input() modeToEdit: Mode | null = null;
//   @Output() close = new EventEmitter<void>();
//   private fb = inject(FormBuilder);
//   private actModsService = inject(ActModsService);

//   form = this.fb.nonNullable.group({
//     name: ['Hard mode', Validators.required],
//     min: [10, Validators.required],
//     max: [14, Validators.required],
//   });

//   acts = signal<Act[]>([]);
//   selectedActs = signal<Set<string>>(new Set()); // Set of Act IDs

//   // Computed/Derived lists for UI
//   normalActs = computed(() => this.acts().filter(a => a.type !== 'Arcana_fight').sort((a, b) => a.name - b.name));
//   arcanaActs = computed(() => this.acts().filter(a => a.type === 'Arcana_fight').sort((a, b) => a.name - b.name));

//   ngOnInit() {
//     this.loadActs().then(() => {
//       if (this.modeToEdit) {
//         this.form.patchValue({
//           name: this.modeToEdit.name,
//           min: this.modeToEdit.min_characters,
//           max: this.modeToEdit.max_characters
//         });
//         const ids = new Set(this.modeToEdit.chambers.map(c => c.id));
//         this.selectedActs.set(ids);
//       }
//     });
//   }

//   async loadActs() {
//     try {
//       const allActs = await this.actModsService.getAllActs();
//       console.log(allActs);

//       this.acts.set(allActs);
//     } catch (error) {
//       console.error('Error loading acts', error);
//     }
//   }

//   toggleSelection(act: Act) {
//     const current = new Set(this.selectedActs());
//     if (current.has(act.id)) {
//       current.delete(act.id);
//     } else {
//       current.add(act.id);
//     }
//     this.selectedActs.set(current);
//   }

//   isSelected(act: Act): boolean {
//     return this.selectedActs().has(act.id);
//   }

//   async save() {
//     if (this.form.invalid) return;

//     const selectedActIds = Array.from(this.selectedActs());
//     const selectedChambers = this.acts().filter(a => selectedActIds.includes(a.id));

//     const modeData: Mode = {
//       id: this.modeToEdit ? this.modeToEdit.id : crypto.randomUUID(),
//       name: this.form.value.name!,
//       min_characters: this.form.value.min!,
//       max_characters: this.form.value.max!,
//       chambers: selectedChambers,
//     };

//     try {
//       if (this.modeToEdit) {
//         await this.actModsService.updateMode(modeData);
//         actModesStore.updateMode(modeData);
//       } else {
//         await this.actModsService.createMode(modeData);
//         actModesStore.addMode(modeData);
//       }
//       this.close.emit();
//     } catch (error) {
//       console.error('Error saving mode', error);
//     }
//   }
// }


import { Component, EventEmitter, inject, Input, OnInit, Output, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { Act, Mode, Fight_type } from '../../../../../../models/models';
import { actModesStore } from '../../../../../store/act-modes.store';
import { CommonModule } from '@angular/common';
import { ActModsService } from '../../../../../shared/services/act-mods.service';

@Component({
  selector: 'app-mode-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './modes-modal.component.html',
  styleUrl: './modes-modal.component.scss'
})
export class ModeModalComponent implements OnInit {
  @Input() modeToEdit: Mode | null = null;
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private actModsService = inject(ActModsService);

  form = this.fb.nonNullable.group({
    name: ['Hard mode', [Validators.required, Validators.minLength(2)]],
    min: [10, [Validators.required, Validators.min(0), Validators.max(50)]],
    max: [14, [Validators.required, Validators.min(1), Validators.max(50)]],
  });

  acts = signal<Act[]>([]);
  selectedActs = signal<Set<string>>(new Set());

  // Computed properties
  normalActs = computed(() =>
    this.acts().filter(a => a.type !== 'Arcana_fight')
      .sort((a, b) => a.name - b.name)
  );

  arcanaActs = computed(() =>
    this.acts().filter(a => a.type === 'Arcana_fight')
      .sort((a, b) => a.name - b.name)
  );

  // Перевірка для кнопки Save
  isSaveDisabled = computed(() => {
    // Форма невалідна
    if (this.form.invalid) {
      return true;
    }

    // Поле name порожнє або має лише пробіли
    const nameValue = this.form.get('name')?.value?.trim();
    if (!nameValue || nameValue.length < 2) {
      return true;
    }

    // Не вибрано жодної камери
    if (this.selectedActs().size === 0) {
      return true;
    }

    // Перевірка min <= max
    const min = this.form.get('min')?.value;
    const max = this.form.get('max')?.value;
    if (min && max && min > max) {
      return true;
    }

    return false;
  });

  // Підрахунок вибраних камер
  selectedCount = computed(() => this.selectedActs().size);

  // Перевірка, чи всі камери вибрані
  allSelected = computed(() => {
    return this.acts().length > 0 &&
      this.selectedActs().size === this.acts().length;
  });

  ngOnInit() {
    this.loadActs().then(() => {
      if (this.modeToEdit) {
        this.patchFormWithMode(this.modeToEdit);
      }
    });

    // Додаємо кастомний валідатор для перевірки min <= max
    this.addMinMaxValidator();
  }

  private addMinMaxValidator(): void {
    this.form.setValidators(this.minLessThanMaxValidator());
  }

  private minLessThanMaxValidator(): ValidatorFn {
    return (form: AbstractControl) => {
      const min = form.get('min')?.value;
      const max = form.get('max')?.value;

      if (min && max && min > max) {
        return { minGreaterThanMax: true };
      }

      return null;
    };
  }

  private patchFormWithMode(mode: Mode): void {
    this.form.patchValue({
      name: mode.name,
      min: mode.min_characters,
      max: mode.max_characters
    });

    const ids = new Set(mode.chambers.map(c => c.id));
    this.selectedActs.set(ids);
  }

  async loadActs() {
    try {
      const allActs = await this.actModsService.getAllActs();
      this.acts.set(allActs);
    } catch (error) {
      console.error('Error loading acts', error);
    }
  }

  toggleSelection(act: Act) {
    const current = new Set(this.selectedActs());

    if (current.has(act.id)) {
      current.delete(act.id);
    } else {
      current.add(act.id);
    }

    this.selectedActs.set(current);
  }

  // Вибір/зняття всіх камер
  toggleSelectAll() {
    if (this.allSelected()) {
      // Зняти всі
      this.selectedActs.set(new Set());
    } else {
      // Вибрати всі
      const allIds = new Set(this.acts().map(act => act.id));
      this.selectedActs.set(allIds);
    }
  }

  isSelected(act: Act): boolean {
    return this.selectedActs().has(act.id);
  }

  // Очистити всі вибори
  clearSelection() {
    this.selectedActs.set(new Set());
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    const nameControl = this.form.get('name');
    const minControl = this.form.get('min');
    const maxControl = this.form.get('max');
    const formErrors = this.form.errors;

    // Перевірка name
    if (nameControl?.invalid && nameControl.touched) {
      if (nameControl.errors?.['required']) {
        errors.push('Mode name is required');
      }
      if (nameControl.errors?.['minlength']) {
        errors.push('Mode name must be at least 2 characters');
      }
    }

    // Перевірка min
    if (minControl?.invalid && minControl.touched) {
      if (minControl.errors?.['required']) {
        errors.push('Min value is required');
      }
      if (minControl.errors?.['min']) {
        errors.push('Min value must be at least 1');
      }
      if (minControl.errors?.['max']) {
        errors.push('Min value cannot exceed 100');
      }
    }

    // Перевірка max
    if (maxControl?.invalid && maxControl.touched) {
      if (maxControl.errors?.['required']) {
        errors.push('Max value is required');
      }
      if (maxControl.errors?.['min']) {
        errors.push('Max value must be at least 1');
      }
      if (maxControl.errors?.['max']) {
        errors.push('Max value cannot exceed 100');
      }
    }

    // Перевірка min <= max
    if (formErrors?.['minGreaterThanMax']) {
      errors.push('Min value cannot be greater than Max value');
    }

    // Перевірка вибраних камер
    if (this.selectedActs().size === 0) {
      errors.push('At least one act must be selected');
    }

    return errors;
  }

  async save() {
    // Помічаємо всі поля як touched для показу помилок
    this.form.markAllAsTouched();

    // Перевіряємо валідність
    if (this.isSaveDisabled()) {
      console.warn('Cannot save: validation errors:', this.getValidationErrors());
      return;
    }

    const selectedActIds = Array.from(this.selectedActs());
    const selectedChambers = this.acts().filter(a => selectedActIds.includes(a.id));

    const modeData: Mode = {
      id: this.modeToEdit ? this.modeToEdit.id : crypto.randomUUID(),
      name: this.form.value.name!.trim(),
      min_characters: this.form.value.min!,
      max_characters: this.form.value.max!,
      chambers: selectedChambers,
    };

    try {
      if (this.modeToEdit) {
        await this.actModsService.updateMode(modeData);
        actModesStore.updateMode(modeData);
      } else {
        await this.actModsService.createMode(modeData);
        actModesStore.addMode(modeData);
      }

      this.close.emit();
    } catch (error) {
      console.error('Error saving mode', error);
    }
  }
}
