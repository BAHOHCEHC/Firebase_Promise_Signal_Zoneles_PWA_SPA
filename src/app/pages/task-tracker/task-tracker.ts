import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TasksService } from '../../shared/services/tasks.service';
import { TaskTable } from '../admin/task-tracker-admin/task-table/task-table';
import { userTasksStore } from '../../store/user-tasks.store';
import { Region_task } from '../../../models/models';

@Component({
  standalone: true,
  selector: 'app-task-tracker',
  imports: [TaskTable, ReactiveFormsModule],
  templateUrl: './task-tracker.html',
  styleUrl: './task-tracker.scss',
})
export class TaskTracker implements OnInit {
  private tasksService = inject(TasksService);
  private fb = inject(FormBuilder);

  public regions = this.tasksService.regions;
  public activeRegionId = signal<string | null>(null);

  // Filter Form
  public filterForm = this.fb.group({
    showUnfinished: [false]
  });
  public showUnfinishedSignal = signal(false);

  // Derived state with merging logic
  public tasks = computed(() => {
    const activeId = this.activeRegionId();
    if (!activeId) return [];

    const serverTasks = this.tasksService.tasks();
    const userTasks = userTasksStore.userTasks();
    const showUnfinished = this.showUnfinishedSignal();

    const regionTasks = serverTasks.filter(t => t.regionId === activeId);

    const mergedTasks = regionTasks.map(task => {
      const userTask = userTasks.find(ut => ut.id === task.id);

      // Merge parts
      let parts = task.parts;
      if (task.parts) {
        parts = task.parts.map(p => {
          const userPart = userTask?.parts?.find(up => up.name === p.name);
          return { ...p, finished: userPart ? userPart.finished : false };
        });
      }

      // Merge finished state
      let isFinished = userTask ? (userTask.finished ?? false) : false;

      // Auto-finish logic for Series Tasks
      if (task.taskSeries && parts && parts.length > 0) {
        if (parts.every(p => p.finished)) {
          isFinished = true;
        }
      }

      return { ...task, finished: isFinished, parts };
    });

    if (showUnfinished) {
      return mergedTasks.filter(t => !t.finished);
    }

    return mergedTasks;
  });

  // Loading state
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  // Derived state
  public activeRegion = computed(() =>
    this.regions().find(c => c.id === this.activeRegionId())
  );

  public hasRegions = computed(() => this.regions().length > 0);

  public async ngOnInit(): Promise<void> {
    this.filterForm.controls.showUnfinished.valueChanges.subscribe(val => {
      this.showUnfinishedSignal.set(!!val);
    });
    await this.loadData();
  }

  public async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.tasksService.loadAllData();

      // Auto-select first category if none is selected
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
    if (task.id) userTasksStore.toggleTaskFinish(task.id, task.regionId);
  }

  onTogglePart(event: { task: Region_task, partName: string }) {
    if (event.task.id) userTasksStore.togglePartFinish(event.task.id, event.partName, event.task.regionId);
  }
}
