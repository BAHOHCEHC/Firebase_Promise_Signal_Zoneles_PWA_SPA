import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { TasksService } from '@shared/services/_index';
import { AddTaskRegionModal } from './add-task-region-modal/add-task-region-modal';
import { TaskTable } from './task-table/task-table';
import { AddTaskModal } from './add-task-modal/add-task-modal';
import { ConfirmModal } from '@core/components/_index';


@Component({
  standalone: true,
  selector: 'app-task-tracker-admin',
  imports: [AddTaskRegionModal, TaskTable, AddTaskModal, ConfirmModal],
  templateUrl: './task-tracker-admin.html',
  styleUrl: './task-tracker-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTrackerAdmin implements OnInit {
  private tasksService = inject(TasksService);
  public regions = this.tasksService.regions;
  public tasks = computed(() => {
    const activeId = this.activeRegionId();
    if (!activeId) return [];
    return this.tasksService.tasks().filter(t => t.regionId === activeId);
  });

  public activeRegionId = signal<string | null>(null);

  // Стан завантаження
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  // Стан модального вікна
  public isEditorModalOpen = signal(false);
  public editorModalType = signal<'region' | 'task'>('region');
  public editorModalData = signal<any>(null);

  public isConfirmModalOpen = signal(false);
  public deletingItem = signal<{ type: 'region' | 'task', data: any } | null>(null);

  // Похідний стан
  public activeRegion = computed(() =>
    this.regions().find(c => c.id === this.activeRegionId())
  );

  public hasRegions = computed(() => this.regions().length > 0);

  public canAddTask = computed(() => {
    // Можна додати завдання тільки якщо є регіони.
    // І в ідеалі, якщо обрано регіон, хоча ми можемо примусово вибрати в модальному вікні.
    return this.regions().length > 0;
  });

  public async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  selectRegion(id: string | undefined) {
    if (id) {
      this.activeRegionId.set(id);
    }
  }

  public async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.tasksService.loadAllData();

      // Автоматичний вибір першої категорії, якщо жодна не обрана
      if (this.hasRegions() && !this.activeRegionId()) {
        const firstId = this.regions()[0].id;
        if (firstId) this.activeRegionId.set(firstId);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ===== Модальні вікна =====

  openAddRegionModal() {
    this.editorModalType.set('region');
    this.editorModalData.set(null);
    this.isEditorModalOpen.set(true);
  }

  onEditRegion(id: string | undefined) {
    console.log(id);

    if (!id) return;
    const region = this.regions().find(r => r.id === id);
    if (region) {
      this.editorModalType.set('region');
      this.editorModalData.set(region);
      this.isEditorModalOpen.set(true);
    }
  }

  openAddTasklModal() {
    this.editorModalType.set('task');
    this.editorModalData.set(null);
    this.isEditorModalOpen.set(true);
  }

  onEditTask(task: any) {
    this.editorModalType.set('task');
    this.editorModalData.set(task);
    this.isEditorModalOpen.set(true);
  }

  onSaveEditor(data: any) {
    // Модальні вікна наразі викликають сервіс безпосередньо (крім AddTaskModal, який я реалізував, щоб теж викликати сервіс).
    // Тому тут ми, ймовірно, просто закриваємо модальне вікно і, можливо, оновлюємо?
    // Але модальні вікна оновлюють стан сервісу, а сигнали оновлюються автоматично.
    // Тому ми просто закриваємо.
    this.isEditorModalOpen.set(false);
  }

  onDeleteFromModal() {
    // Викликано з модального вікна редагування (кнопка видалення)
    // Нам потрібно переключитися на модальне вікно підтвердження
    this.isEditorModalOpen.set(false);

    const data = this.editorModalData();
    const type = this.editorModalType();

    if (data && type) {
      this.confirmDeletePrompt(type, data);
    }
  }

  // ===== Видалення =====

  onDeleteTask(task: any) {
    this.confirmDeletePrompt('task', task);
  }

  confirmDeletePrompt(type: 'region' | 'task', data: any) {
    this.deletingItem.set({ type, data });
    this.isConfirmModalOpen.set(true);
  }

  async onConfirmDelete(): Promise<void> {
    const item = this.deletingItem();
    if (!item) return;

    try {
      if (item.type === 'region') {
        await this.tasksService.deleteRegion(item.data.id);
        // Якщо ми видалили активний регіон, вибираємо перший або null
        if (this.activeRegionId() === item.data.id) {
          const remaining = this.regions();
          this.activeRegionId.set(remaining.length > 0 ? remaining[0].id! : null);
        }
      } else {
        await this.tasksService.deleteTask(item.data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.isConfirmModalOpen.set(false);
      this.deletingItem.set(null);
    }
  }

}
