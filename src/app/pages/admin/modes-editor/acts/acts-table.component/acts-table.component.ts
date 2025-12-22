import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Act } from '../../../../../../models/models';

@Component({
  selector: 'app-acts-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acts-table.component.html',
  styleUrls: ['./acts-table.component.scss']
})
export class ActsTableComponent {
  @Input() acts: Act[] = [];
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  @Output() editAct = new EventEmitter<Act>();
  @Output() refresh = new EventEmitter<void>();

  // Метод для отримання списку активних опцій
  getActiveOptions(act: Act): string[] {
    const options = act.options;
    const activeOptions: string[] = [];

    if (options.amount) activeOptions.push('Amount');
    if (options.timer) activeOptions.push('Timer');
    if (options.defeat) activeOptions.push('Defeat');
    if (options.special_type) activeOptions.push('Special Type');

    return activeOptions;
  }

  // Метод для відображення типу
  getTypeDisplay(type: string): string {
    switch (type) {
      case 'Boss_fight': return 'Boss';
      case 'Variation_fight': return 'Variation';
      case 'Arcana_fight': return 'Arcana';
      default: return type;
    }
  }

  // Метод для форматування назви акта
  getActDisplayName(act: Act): string {
    const typeDisplay = this.getTypeDisplay(act.type);
    return `${typeDisplay} ${act.name}`;
  }

  onEditClick(act: Act): void {
    this.editAct.emit(act);
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}
