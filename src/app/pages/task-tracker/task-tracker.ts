import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { TasksService } from '@shared/services/_index';
import { TaskTable } from '../admin/task-tracker-admin/task-table/task-table';
import { UserTasksStore } from '@store/_index';
import { Region_task } from '@models/models';

@Component({
  standalone: true,
  selector: 'app-task-tracker',
  imports: [TaskTable, ReactiveFormsModule],
  templateUrl: './task-tracker.html',
  styleUrl: './task-tracker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTracker implements OnInit, OnDestroy {
  private tasksService = inject(TasksService);
  private fb = inject(FormBuilder);
  private userTasksStore = inject(UserTasksStore);

  public regions = this.tasksService.regions;
  public activeRegionId = signal<string | null>(null);

  // Форма фільтрації
  public filterForm = this.fb.group({
    showUnfinished: [false],
    filtering: ['']
  });
  public showUnfinishedSignal = signal(false);
  public filteringSignal = signal('');

  private destroy$ = new Subject<void>();

  // Похідний стан з логікою злиття
  public tasks = computed(() => {
    const activeId = this.activeRegionId();
    if (!activeId) return [];

    const serverTasks = this.tasksService.tasks();
    const userTasks = this.userTasksStore.userTasks();
    const showUnfinished = this.showUnfinishedSignal();
    const filterValue = this.filteringSignal().toLowerCase();

    const regionTasks = serverTasks.filter(t => t.regionId === activeId);

    const mergedTasks = regionTasks.map(task => {
      const userTask = userTasks.find(ut => ut.id === task.id);

      // Об'єднання частин
      let parts = task.parts;
      if (task.parts) {
        parts = task.parts.map(p => {
          const userPart = userTask?.parts?.find(up => up.name === p.name);
          return { ...p, finished: userPart ? userPart.finished : false };
        });
      }

      // Об'єднання стану завершення
      let isFinished = userTask ? (userTask.finished ?? false) : false;

      // Логіка автозавершення для серій завдань
      if (task.taskSeries && parts && parts.length > 0) {
        if (parts.every(p => p.finished)) {
          isFinished = true;
        }
      }

      return { ...task, finished: isFinished, parts };
    });

    let filteredTasks = mergedTasks;

    if (showUnfinished) {
      filteredTasks = filteredTasks.filter(t => !t.finished);
    }

    if (filterValue) {
      filteredTasks = filteredTasks.filter(t =>
        t.name?.toLowerCase().includes(filterValue) ||
        t.achiviment?.toLowerCase().includes(filterValue)
      );
    }

    return filteredTasks;
  });

  // Стан завантаження
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  // Похідний стан
  public activeRegion = computed(() =>
    this.regions().find(c => c.id === this.activeRegionId())
  );

  public hasRegions = computed(() => this.regions().length > 0);

  public async ngOnInit(): Promise<void> {
    this.filterForm.controls.showUnfinished.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        this.showUnfinishedSignal.set(!!val);
      });

    this.filterForm.controls.filtering.valueChanges
      .pipe(
        debounceTime(600),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(val => {
        this.filteringSignal.set(val || '');
      });

    await this.loadData();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  selectRegion(id: string | undefined) {
    if (id) {
      this.activeRegionId.set(id);
    }
  }

  onToggleTask(task: Region_task) {
    if (task.id) this.userTasksStore.toggleTaskFinish(task.id, task.regionId, task.name);
  }

  onTogglePart(event: { task: Region_task, partName: string }) {
    if (event.task.id) this.userTasksStore.togglePartFinish(event.task.id, event.partName, event.task.regionId,event.task.name);
  }
}
