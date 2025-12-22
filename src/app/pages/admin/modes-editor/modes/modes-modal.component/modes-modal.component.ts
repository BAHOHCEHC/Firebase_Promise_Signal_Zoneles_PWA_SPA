import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Mode } from '../../../../../../models/models';
import { actModesStore } from '../../../../../store/act-modes.store';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mode-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './modes-modal.component.html',
})
export class ModeModalComponent {
  @Output() close = new EventEmitter<void>();
  private fb = inject(FormBuilder);
  form = this.fb.nonNullable.group({
    name: '',
    min: 1,
    max: 4,
  });


  save() {
    const mode: Mode = {
      id: crypto.randomUUID(),
      name: this.form.value.name!,
      min_characters: this.form.value.min!,
      max_characters: this.form.value.max!,
      chambers: [],
    };

    actModesStore.addMode(mode);
    this.close.emit();
  }
}
