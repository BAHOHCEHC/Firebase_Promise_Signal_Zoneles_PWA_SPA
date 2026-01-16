import { Component, EventEmitter, Input, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Region_task } from '../../../../../models/models';

@Component({
  standalone: true,
  selector: 'app-task-table',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-table.html',
  styleUrl: './task-table.scss',
})
export class TaskTable {
  @Input() tasks: Region_task[] = [];
  @Input() userMode: boolean = false;
  @Input() adminMode: boolean = false;
  @Input() filterForm?: FormGroup;
  public loading = input<boolean>(true);
  @Input() error: string | null = null;

  @Output() edit = new EventEmitter<Region_task>();
  @Output() delete = new EventEmitter<Region_task>();
  @Output() toggleTask = new EventEmitter<Region_task>();
  @Output() togglePart = new EventEmitter<{ task: Region_task, partName: string }>();

  public expandedTasks = new Set<string>();

  onEdit(task: Region_task) {
    this.edit.emit(task);
  }

  onDelete(task: Region_task) {
    this.delete.emit(task);
  }

  toggleExpand(taskId: string | undefined) {
    if (!taskId) return;
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
  }

  isExpanded(taskId: string | undefined): boolean {
    if (!taskId) return false;
    return this.expandedTasks.has(taskId);
  }

  onToggleTask(task: Region_task) {
    this.toggleTask.emit(task);
  }

  onTogglePart(task: Region_task, partName: string) {
    this.togglePart.emit({ task, partName });
  }
}
