import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ActModesStore } from '@store/_index';
import { CommonModule } from '@angular/common';
import { ActModsService } from '@shared/services/_index';
import { Mode } from '@models/models';

@Component({
  selector: 'app-modes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modes-table.html',
  styleUrl: './modes-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModesTable {
  actModsService = inject(ActModsService);
  protected readonly actModesStore = inject(ActModesStore);

  // Keep for template backward compatibility if needed, or update template to use actModesStore
  store = this.actModesStore;

  @Input() modes: Mode[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() edit = new EventEmitter<Mode>();
  @Output() delete = new EventEmitter<Mode>();

  onEdit(mode: Mode) {
    this.edit.emit(mode);
  }

  onDelete(mode: Mode) {
    this.delete.emit(mode);
  }
}
