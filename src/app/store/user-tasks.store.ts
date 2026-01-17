import { signal } from '@angular/core';
import { Region_task } from '../../models/models';

class UserTasksStore {
    /** Tasks with user state (finished status) loaded from localStorage */
    readonly userTasks = signal<Region_task[]>([]);

    constructor() {
        this.loadFromLocalStorage();
    }

    /** Save tasks to localStorage */
    saveToLocalStorage() {
        try {
            localStorage.setItem(
                'UserTasks',
                JSON.stringify(this.userTasks())
            );
        } catch (e) {
            console.error('Failed to save tasks to localStorage', e);
        }
    }

    /** Load tasks from localStorage */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('UserTasks');
            if (stored) {
                const tasks = JSON.parse(stored) as Region_task[];
                this.userTasks.set(tasks);
            }
        } catch (e) {
            console.error('Failed to load tasks from localStorage', e);
        }
    }

    /** Toggle finished state of a task */
    toggleTaskFinish(taskId: string, regionId: string) {
        this.userTasks.update(tasks => {
            const existingTaskIndex = tasks.findIndex(t => t.id === taskId);

            if (existingTaskIndex !== -1) {
                // Task exists, toggle finished
                const updatedTasks = [...tasks];
                const currentTask = updatedTasks[existingTaskIndex];
                updatedTasks[existingTaskIndex] = {
                    ...currentTask,
                    finished: !currentTask.finished,
                    regionId: regionId // Ensure regionId is up to date
                };
                // If task is unchecked, should we remove it if it has no other data?
                // for now keep it to remember state.
                return updatedTasks;
            } else {
                // Task not in store, add it as finished
                // We only store the ID and finished state, merging happens in the component
                // But we need to conform to Region_task interface.
                // We can create a partial object. The merge logic will handle the rest.
                const newTask: Region_task = {
                    id: taskId,
                    name: '', // Name and other fields come from server data
                    regionId: regionId,
                    finished: true
                };
                return [...tasks, newTask];
            }
        });
        this.saveToLocalStorage();
    }

    /** Toggle finished state of a part within a task */
    togglePartFinish(taskId: string, partName: string, regionId: string) {
        this.userTasks.update(tasks => {
            const existingTaskIndex = tasks.findIndex(t => t.id === taskId);

            if (existingTaskIndex !== -1) {
                const updatedTasks = [...tasks];
                const task = { ...updatedTasks[existingTaskIndex] };

                // Ensure parts array exists
                const parts = task.parts ? [...task.parts] : [];
                const partIndex = parts.findIndex(p => p.name === partName);

                if (partIndex !== -1) {
                    // Part exists, toggle
                    parts[partIndex] = { ...parts[partIndex], finished: !parts[partIndex].finished };
                } else {
                    // Part doesn't exist in store, add it
                    parts.push({ name: partName, finished: true });
                }

                task.parts = parts;
                task.regionId = regionId; // Ensure regionId is up to date
                updatedTasks[existingTaskIndex] = task;
                return updatedTasks;
            } else {
                // Task doesn't exist, create it with the part
                const newTask: Region_task = {
                    id: taskId,
                    name: '',
                    regionId: regionId,
                    parts: [{ name: partName, finished: true }]
                };
                return [...tasks, newTask];
            }
        });
        this.saveToLocalStorage();
    }

    /** Check if a task is finished */
    isTaskFinished(taskId: string): boolean {
        return this.userTasks().find(t => t.id === taskId)?.finished ?? false;
    }

    /** Check if a part is finished */
    isPartFinished(taskId: string, partName: string): boolean {
        const task = this.userTasks().find(t => t.id === taskId);
        return task?.parts?.find(p => p.name === partName)?.finished ?? false;
    }
}

export const userTasksStore = new UserTasksStore();
