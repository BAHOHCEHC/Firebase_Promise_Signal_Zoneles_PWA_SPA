import { CommonModule } from "@angular/common";
import { Component, OnInit, Input, Output, EventEmitter, signal, inject, computed } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Region, Region_task } from "../../../../../models/models";
import { TasksService } from "../../../../shared/services/tasks.service";
import { generateUUID } from "../../../../shared/utils/uuid";


@Component({
  standalone: true,
  selector: 'app-add-task-region-modal',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-task-region-modal.html',
  styleUrl: './add-task-region-modal.scss',
})
export class AddTaskRegionModal implements OnInit {
  @Input() regionToEdit: Region | null = null;
  @Output() close = new EventEmitter<void>();
  public selectedTasks = signal<Set<string>>(new Set());

  private fb = inject(FormBuilder);
  private taskService = inject(TasksService);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  regions = signal<Region[]>([]);
  regionTasks = signal<Region_task[]>([]);

  // Перевірка для кнопки Save
  isSaveDisabled(): boolean {
    const nameControl = this.form.get('name');
    const nameValue = nameControl?.value?.trim();

    return (
      this.form.invalid ||
      !nameValue ||
      nameValue.length < 2
    );
  }

  @Output() delete = new EventEmitter<void>();

  // Use service signal directly if needed or sync
  // actually for uniqueness check we might want to check against service.regions()

  ngOnInit() {
    // If we are editing, we are provided with regionToEdit
    if (this.regionToEdit) {
      this.patchFormWithRegion(this.regionToEdit);
    }
  }

  private patchFormWithRegion(region: Region): void {
    this.form.patchValue({
      name: region.name
    });
  }

  // Helper validation getter
  getValidationErrors(): string[] {
    const errors: string[] = [];
    const nameControl = this.form.get('name');

    if (nameControl?.invalid && (nameControl.dirty || nameControl.touched)) {
      if (nameControl.errors?.['required']) {
        errors.push('Region name is required');
      }
    }
    return errors;
  }

  async save() {
    this.form.markAllAsTouched();

    if (this.isSaveDisabled()) {
      return;
    }

    const regionData: Region = {
      id: this.regionToEdit ? this.regionToEdit.id : generateUUID(),
      name: this.form.value.name!.trim()
    };

    try {
      if (this.regionToEdit) {
        await this.taskService.updateRegion(regionData);
      } else {
        await this.taskService.createRegion(regionData);
      }
      this.close.emit();
    } catch (error) {
      console.error('Error saving region', error);
    }
  }

  onDelete() {
    this.delete.emit();
  }
}
