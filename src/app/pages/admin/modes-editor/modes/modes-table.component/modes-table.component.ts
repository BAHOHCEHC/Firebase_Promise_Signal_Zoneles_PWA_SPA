import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { actModesStore } from '../../../../../store/act-modes.store';
import { CommonModule } from '@angular/common';
import { ActModsService } from '../../../../../shared/services/act-mods.service';
import { Mode } from '../../../../../../models/models';

@Component({
  selector: 'app-modes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modes-table.component.html',
  styleUrl: './modes-table.component.scss'
})
export class ModesTableComponent {
  actModsService = inject(ActModsService);
  store = actModesStore;

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
