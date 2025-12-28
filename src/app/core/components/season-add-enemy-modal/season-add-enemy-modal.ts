import { Component, EventEmitter, Input, Output, signal, inject, computed, effect  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Act_options, Enemy, EnemyCategory, EnemyGroup, ElementTypeName } from '../../../../models/models';

@Component({
  selector: 'app-season-add-enemy-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './season-add-enemy-modal.html',
  styleUrl: './season-add-enemy-modal.scss',
})
export class SeasonAddEnemyModal {
  @Input() public actOptions: Act_options = {};
  @Input() public categories: EnemyCategory[] = [];
  @Input() public allEnemies: Enemy[] = [];

  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<{
    enemies: Enemy[];
    options: {
      amount?: string;
      timer?: string;
      defeat?: string;
      special_type?: boolean;
    };
  }>();

  private fb = inject(FormBuilder);
  private initialized = signal(false);

  // Стан вибору
  public selectedCategoryId = signal<string | null>(null);
  public filteredGroups = signal<EnemyGroup[]>([]);

  // Множинний вибір ворогів
  public selectedEnemies = signal<Enemy[]>([]);

  // Чи є хоча б один вибраний ворог
  public hasSelectedEnemies = computed(() => this.selectedEnemies().length > 0);



  constructor() {
    effect(() => {
      // якщо вже ініціалізували — нічого не робимо
      if (this.initialized()) return;

      const cats = this.categories;
      if (!cats || cats.length === 0) return;

      // знайти першу НЕпорожню категорію
      const firstValid = cats.find(cat => !this.isCategoryEmpty(cat.id));
      if (!firstValid) return;

      this.onSelectCategory(firstValid.id);
      this.initialized.set(true);
    });
  }


  // Форма для опцій (amount, timer тощо)
  public form = this.fb.group({
    amount: [''],
    timer: [''],
    defeat: [''],
    special_type: [false],
  });

  // Чи категорія порожня
  public isCategoryEmpty(catId: string): boolean {
    const cat = this.categories.find(c => c.id === catId);
    if (!cat || !cat.groups || cat.groups.length === 0) return true;

    return !cat.groups.some(group =>
      this.allEnemies.some(e => e.groupId === group.id)
    );
  }

  public onSelectCategory(categoryId: string): void {
    if (this.isCategoryEmpty(categoryId)) return;

    this.selectedCategoryId.set(categoryId);

    const cat = this.categories.find(c => c.id === categoryId);
    this.filteredGroups.set(cat?.groups ?? []);
  }

  // Множинний вибір ворога
  public toggleEnemy(enemy: Enemy): void {
    const current = this.selectedEnemies();
    const exists = current.some(e => e.id === enemy.id);

    if (exists) {
      // Знімаємо вибір
      this.selectedEnemies.set(current.filter(e => e.id !== enemy.id));
    } else {
      // Додаємо
      this.selectedEnemies.set([...current, enemy]);
    }
  }

  // Чи вибраний конкретний ворог
  public isEnemySelected(enemy: Enemy): boolean {
    return this.selectedEnemies().some(e => e.id === enemy.id);
  }

  // Вороги в групі
  public enemiesByGroup(groupId: string): Enemy[] {
    return this.allEnemies.filter(e => e.groupId === groupId);
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `/assets/images/ElementType_${type}.png`;
  }

  public onSave(): void {
    this.form.markAllAsTouched();
    if (this.selectedEnemies().length === 0) return;

    const formValue = this.form.getRawValue();

    const options = {
      amount: this.actOptions.amount ? formValue.amount || undefined : undefined,
      timer: this.actOptions.timer ? formValue.timer || undefined : undefined,
      defeat: this.actOptions.defeat ? formValue.defeat || undefined : undefined,
      special_type: this.actOptions.special_type !== undefined
        ? !!formValue.special_type  // ← примусово boolean
        : undefined,
    };


    this.save.emit({
      enemies: this.selectedEnemies(),
      options,
    });
  }

  public onClose(): void {
    this.close.emit();
  }
}

