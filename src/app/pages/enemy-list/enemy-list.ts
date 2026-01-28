import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { EnemiesService } from '@shared/services/_index';
import { Enemy } from '@models/models';

@Component({
  selector: 'app-enemy-list',
  imports: [],
  templateUrl: './enemy-list.html',
  styleUrl: './enemy-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyList implements OnInit {
  private enemiesService = inject(EnemiesService);

  public categories = this.enemiesService.categories;
  public activeCategoryId = signal<string | null>(null);

  // Стан завантаження
  public isLoading = signal(true);
  public error = signal<string | null>(null);
  // Похідний стан
  public activeCategory = computed(() =>
    this.categories().find((c) => c.id === this.activeCategoryId()),
  );
  public hasCategories = computed(() => this.categories().length > 0);

  public async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  public async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.enemiesService.loadAllData();

      // Автоматичний вибір першої категорії, якщо жодна не обрана
      if (this.hasCategories() && !this.activeCategoryId()) {
        this.activeCategoryId.set(this.categories()[0].id);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  public selectCategory(id: string): void {
    this.activeCategoryId.set(id);
  }

  public getEnemiesForGroup(groupId: string): Enemy[] {
    return this.enemiesService.getEnemiesForGroup(groupId);
  }
}
