import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnemiesService } from '../../../shared/services/enemies.service';
import { EnemyEditorModalComponent } from '../../../core/components/enemy-editor-modal/enemy-editor-modal.component';
import { ConfirmModal } from '../../../core/components/confirm-modal/confirm-modal';
import { Enemy, EnemyGroup, ModalType } from '../../../../models/models';


@Component({
  standalone: true,
  selector: 'app-enemy-editor',
  imports: [CommonModule, EnemyEditorModalComponent, ConfirmModal],
  templateUrl: './enemy-editor.html',
  styleUrl: './enemy-editor.scss',
})
export class EnemyEditor implements OnInit {
  private enemiesService = inject(EnemiesService);

  public categories = this.enemiesService.categories;
  public activeCategoryId = signal<string | null>(null);

  // Modal State
  public isEditorModalOpen = signal(false);
  readonly editorModalType = signal<ModalType>('categories');
  public editorModalData = signal<any>(null);

  public isConfirmModalOpen = signal(false);
  public enemyToDeleteId = signal<string | null>(null);

  // Loading state
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  // Derived state
  public activeCategory = computed(() =>
    this.categories().find(c => c.id === this.activeCategoryId())
  );

  public hasCategories = computed(() => this.categories().length > 0);

  public canAddGroup = computed(() => !!this.activeCategoryId());

  public canAddEnemy = computed(() => {
    const cat = this.activeCategory();
    return !!cat && cat.groups.length > 0;
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.enemiesService.loadAllData();

      // Auto-select first category if none is selected
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

  openEnemiesUniversalModal(type: ModalType): void {
    this.editorModalType.set(type);

    // Очищаємо попередні дані
    this.editorModalData.set(null);

    // Підготовка даних для модалки
    const data: any = {};

    if (type === 'group' && this.activeCategoryId()) {
      data.categoryId = this.activeCategoryId();
      // Не встановлюємо title, щоб форма була порожньою
    } else if (type === 'enemy' && this.activeCategoryId()) {
      data.categoryId = this.activeCategoryId();
      // Не встановлюємо інші поля
    }

    this.editorModalData.set(data);
    this.isEditorModalOpen.set(true);
  }

  async onSaveEditor(data: any): Promise<void> {
    try {
      const type = this.editorModalType();

      if (type === 'categories') {
        await this.enemiesService.addCategory(data.title);
        // Auto-select if first one
        if (this.categories().length === 1) {
          this.activeCategoryId.set(this.categories()[0].id);
        }
      } else if (type === 'group') {
        if (data.id) {
          // Editing existing group
          await this.enemiesService.updateGroup(data.id, { title: data.title });
        } else {
          // Creating new group
          await this.enemiesService.addGroup(data.title, data.categoryId);
        }
      } else if (type === 'enemy') {
        await this.enemiesService.addEnemy({
          name: data.name,
          elementName: data.element,
          avatarUrl: data.avatarUrl,
          categoryId: data.categoryId,
          groupId: data.groupId
        });
      }

      this.isEditorModalOpen.set(false);
      await this.loadData(); // Refresh data
    } catch (error) {
      console.error('Error saving data:', error);
      this.error.set('Failed to save data');
    }
  }

  selectCategory(id: string): void {
    this.activeCategoryId.set(id);
  }

  // Edit Group
  onEditGroup(group: EnemyGroup, categoryId: string): void {
    this.editorModalType.set('group');
    this.editorModalData.set({
      id: group.id, // Include ID for update
      title: group.title,
      categoryId: categoryId
    });
    this.isEditorModalOpen.set(true);
  }

  // Delete Enemy
  onDeleteEnemy(enemyId: string): void {
    this.enemyToDeleteId.set(enemyId);
    this.isConfirmModalOpen.set(true);
  }

  async confirmDelete(): Promise<void> {
    const id = this.enemyToDeleteId();
    if (id) {
      try {
        await this.enemiesService.deleteEnemy(id);
        this.isConfirmModalOpen.set(false);
        this.enemyToDeleteId.set(null);
        await this.loadData(); // Refresh data
      } catch (error) {
        console.error('Error deleting enemy:', error);
        this.error.set('Failed to delete enemy');
      }
    }
  }

  getEnemiesForGroup(groupId: string): Enemy[] {
    return this.enemiesService.getEnemiesForGroup(groupId);
  }

  getEnemiesByGroup(groupId: string): Enemy[] {
    return this.enemiesService.getEnemiesByGroup(groupId);
  }

  // Helper method for template
  getCategoryGroups(categoryId: string): EnemyGroup[] {
    return this.enemiesService.getGroupsForCategory(categoryId);
  }

  // Refresh data
  async refresh(): Promise<void> {
    await this.loadData();
  }
}
