import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
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
  @Output() deleteAct = new EventEmitter<Act>();
  @Output() refresh = new EventEmitter<void>();

  // Для управління станом видалення
  deletingAct: Act | null = null;

  // Порядок відображення типів
  private readonly typeOrder = ['Variation_fight', 'Boss_fight', 'Arcana_fight'];

  // Назви секцій для типів
  private readonly sectionTitles: Record<string, string> = {
    'Variation_fight': 'Variation Chambers',
    'Boss_fight': 'Boss Chambers',
    'Arcana_fight': 'Arcana Chambers'
  };

  // Розділені та відсортовані акти
  readonly sortedActs = computed(() => {
    if (!this.acts.length) return [];

    // Групуємо акти за типом
    const actsByType: Record<string, Act[]> = {};

    this.acts.forEach(act => {
      if (!actsByType[act.type]) {
        actsByType[act.type] = [];
      }
      actsByType[act.type].push(act);
    });

    // Сортуємо акти всередині кожної групи по name (від 1 до більшого)
    Object.keys(actsByType).forEach(type => {
      actsByType[type].sort((a, b) => a.name - b.name);
    });

    // Створюємо масив з групами в правильному порядку
    const result: Array<{ type: string, title: string, acts: Act[] }> = [];

    this.typeOrder.forEach(type => {
      if (actsByType[type] && actsByType[type].length > 0) {
        result.push({
          type,
          title: this.sectionTitles[type],
          acts: actsByType[type]
        });
      }
    });

    return result;
  });

  // Загальна кількість актів
  readonly totalActsCount = computed(() => {
    return this.acts.length;
  });

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

    // Для Boss_fight та Variation_fight виводимо "Act X"
    if (act.type === 'Boss_fight' || act.type === 'Variation_fight') {
      return `Act ${act.name}`;
    }
    // Для Arcana_fight виводимо "Arcana X"
    else if (act.type === 'Arcana_fight') {
      return `Arcana ${act.name}`;
    }

    return `${typeDisplay} ${act.name}`;
  }

  // Метод для отримання іконки для типу
  getTypeIcon(type: string): string {
    switch (type) {
      case 'Boss_fight': return 'skull';
      case 'Variation_fight': return 'swap_horiz';
      case 'Arcana_fight': return 'auto_awesome';
      default: return 'category';
    }
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onEditClick(act: Act): void {
    this.editAct.emit(act);
  }

  onDeleteClick(act: Act): void {
    this.deletingAct = act;
    this.deleteAct.emit(act);
  }

}
