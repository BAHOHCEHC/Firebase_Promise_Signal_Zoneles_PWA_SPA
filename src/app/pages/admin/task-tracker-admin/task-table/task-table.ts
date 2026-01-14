import { Component, EventEmitter, Input, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Region_task } from '../../../../../models/models';

@Component({
  standalone: true,
  selector: 'app-task-table',
  imports: [CommonModule],
  templateUrl: './task-table.html',
  styleUrl: './task-table.scss',
})
export class TaskTable {
  @Input() tasks: Region_task[] = [];
  public loading = input<boolean>(true);
  @Input() error: string | null = null;

  @Output() edit = new EventEmitter<Region_task>();
  @Output() delete = new EventEmitter<Region_task>();

  onEdit(task: Region_task) {
    this.edit.emit(task);
  }

  onDelete(task: Region_task) {
    this.delete.emit(task);
  }
}
