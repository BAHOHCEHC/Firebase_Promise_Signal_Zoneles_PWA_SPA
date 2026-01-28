import { signal, Injectable } from '@angular/core';
import { Region_task } from '../../models/models';
import { IndexedDbUtil } from '@utils/indexed-db';

@Injectable({
    providedIn: 'root',
})
export class UserTasksStore {
    /** Завдання зі станом користувача (статус завершення), завантажені з localStorage */
    readonly userTasks = signal<Region_task[]>([]);

    constructor() {
        this.loadFromIndexedDb();
    }

    /** Збереження завдань в IndexedDB */
    private async saveToIndexedDb() {
        try {
            await IndexedDbUtil.set('UserTasks', this.userTasks());
        } catch (e) {
            console.error('Failed to save tasks to IndexedDB', e);
        }
    }

    /** Завантаження завдань з IndexedDB */
    private async loadFromIndexedDb() {
        try {
            const tasks = await IndexedDbUtil.get<Region_task[]>('UserTasks');
            if (tasks && Array.isArray(tasks)) {
                this.userTasks.set(tasks);
            }
        } catch (e) {
            console.error('Failed to load tasks from IndexedDB', e);
        }
    }

    /** Перемикання стану завершення завдання */
    toggleTaskFinish(taskId: string, regionId: string, name: string) {
        this.userTasks.update(tasks => {
            const existingTaskIndex = tasks.findIndex(t => t.id === taskId);

            if (existingTaskIndex !== -1) {
              // Завдання існує, перемикаємо завершення
              const updatedTasks = [...tasks];
              const currentTask = updatedTasks[existingTaskIndex];
              updatedTasks[existingTaskIndex] = {
                ...currentTask,
                finished: !currentTask.finished,
                regionId: regionId, // Переконатися, що regionId актуальний
                name: name || ''
              };
                // Якщо завдання знято, чи варто його видаляти, якщо немає інших даних?
                // наразі залишаємо для збереження стану.
                return updatedTasks;
            } else {
                // Завдання немає в сховищі, додаємо як завершене
                // Ми зберігаємо лише ID та стан завершення, об'єднання відбувається в компоненті
                // Але ми повинні відповідати інтерфейсу Region_task.
                // Ми можемо створити частковий об'єкт. Логіка об'єднання зробить решту.
                const newTask: Region_task = {
                    id: taskId,
                    name: name || '', // Ім'я та інші поля надходять з даних сервера
                    regionId: regionId,
                    finished: true
                };
                return [...tasks, newTask];
            }
        });
        this.saveToIndexedDb();
    }

    /** Перемикання стану завершення частини в межах завдання */
    togglePartFinish(taskId: string, partName: string, regionId: string, name: string) {
        this.userTasks.update(tasks => {
            const existingTaskIndex = tasks.findIndex(t => t.id === taskId);

            if (existingTaskIndex !== -1) {
                const updatedTasks = [...tasks];
                const task = { ...updatedTasks[existingTaskIndex] };

                // Переконатися, що масив частин існує
                const parts = task.parts ? [...task.parts] : [];
                const partIndex = parts.findIndex(p => p.name === partName);

                if (partIndex !== -1) {
                    // Частина існує, перемикаємо
                    parts[partIndex] = { ...parts[partIndex], finished: !parts[partIndex].finished };
                } else {
                    // Частина не існує в сховищі, додаємо її
                    parts.push({ name: partName, finished: true });
                }

                task.parts = parts;
                task.name = name || '';
                task.regionId = regionId; // Переконатися, що regionId актуальний
                updatedTasks[existingTaskIndex] = task;
                return updatedTasks;
            } else {
                // Завдання не існує, створюємо його разом з частиною
                const newTask: Region_task = {
                    id: taskId,
                    name: name || '',
                    regionId: regionId,
                    parts: [{ name: partName, finished: true }]
                };
                return [...tasks, newTask];
            }
        });
        this.saveToIndexedDb();
    }

    /** Перевірка, чи завершено завдання */
    isTaskFinished(taskId: string): boolean {
        return this.userTasks().find(t => t.id === taskId)?.finished ?? false;
    }

    /** Перевірка, чи завершена частина */
    isPartFinished(taskId: string, partName: string): boolean {
        const task = this.userTasks().find(t => t.id === taskId);
        return task?.parts?.find(p => p.name === partName)?.finished ?? false;
    }
}
