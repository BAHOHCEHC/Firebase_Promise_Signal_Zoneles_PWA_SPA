import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { Region, Region_task } from '../../../../../models/models';
import { TasksService } from '../../../../shared/services/_index';
import { generateUUID } from '../../../../shared/utils/uuid';

@Component({
  standalone: true,
  selector: 'app-add-task-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-task-modal.html',
  styleUrl: './add-task-modal.scss',
})
export class AddTaskModal implements OnInit {
  @Input() data: Region_task | null = null;
  @Input() categories: Region[] = [];
  @Input() activeCategoryId: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Region_task>();
  @Output() delete = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private tasksService = inject(TasksService);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    regionId: ['', [Validators.required]],
    achiviment: [''],
    youtubeLink: [''],
    taskSeries: [false],
    parts: this.fb.array([])
  });

  isSaving = signal(false);
  isSaveDisabled = computed(() => this.form.invalid || this.isSaving());

  ngOnInit() {
    if (this.data) {
      this.patchForm(this.data);
    } else if (this.activeCategoryId) {
      this.form.patchValue({ regionId: this.activeCategoryId });
    }
  }

  get parts(): FormArray {
    return this.form.get('parts') as FormArray;
  }

  addPart(): void {
    const partGroup = this.fb.group({
      quest_name: ['', Validators.required]
    });
    this.parts.push(partGroup);
  }

  removePart(index: number): void {
    this.parts.removeAt(index);
  }

  private patchForm(task: Region_task): void {
    this.form.patchValue({
      name: task.name,
      regionId: task.regionId,
      achiviment: task.achiviment || '',
      youtubeLink: task.youtubeLink || '',
      taskSeries: !!task.taskSeries
    });

    this.parts.clear();
    if (task.taskSeries && task.parts?.length) {
      task.parts.forEach(part => {
        this.parts.push(
          this.fb.group({
            quest_name: [part.name || '', Validators.required]
          })
        );
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const formValue = this.form.getRawValue();

      const taskData: Region_task = {
        id: this.data?.id ?? generateUUID(),
        name: formValue.name!,
        regionId: formValue.regionId!,
        achiviment: formValue.achiviment || '',
        youtubeLink: formValue.youtubeLink || '',
        taskSeries: formValue.taskSeries ?? false,   // ← null → false
        parts: (formValue.taskSeries ?? false)
          ? (formValue.parts as { quest_name: string }[]).map(p => ({ name: p.quest_name }))
          : [],
        finished: this.data?.finished ?? false
      };

      if (this.data) {
        await this.tasksService.updateTask(taskData);
      } else {
        await this.tasksService.createTask(taskData);
      }

      this.close.emit();
    } catch (error) {
      console.error('Error saving task:', error);
      // Тут можна додати повідомлення користувачу (toast/snackbar)
    } finally {
      this.isSaving.set(false);
    }
  }

  onDelete(): void {
    this.delete.emit();
  }
}
