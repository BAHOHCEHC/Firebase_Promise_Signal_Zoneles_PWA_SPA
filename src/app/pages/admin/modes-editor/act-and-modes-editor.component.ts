import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActModalComponent } from './acts/act-modal.component/act-modal.component';
import { ActsTableComponent } from './acts/acts-table.component/acts-table.component';
import { ModesTableComponent } from './modes/modes-table.component/modes-table.component';
import { ModeModalComponent } from './modes/modes-modal.component/modes-modal.component';
import { ActModsService } from '../../../shared/services/act-mods.service';
import { Act } from '../../../../models/models';
import { ConfirmModal } from '../../../core/components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-act-and-modes-editor',
  standalone: true,
  imports: [
    CommonModule,
    ActsTableComponent,
    ModesTableComponent,
    ActModalComponent,
    ModeModalComponent,
    ConfirmModal
  ],
  templateUrl: './act-and-modes-editor.component.html',
  styleUrls: ['./act-and-modes-editor.component.scss'],
})
export class ActAndModesEditor implements OnInit {
  private service = inject(ActModsService);

  loading = signal(false); // Використовуємо signal замість звичайної властивості
  acts: Act[] = [];
  error: string | null = null;

  readonly showActModal = signal(false);
  readonly showModeModal = signal(false);
  readonly showConfirmModal = signal(false);
  readonly editingAct = signal<Act | null>(null);
  readonly deletingItem = signal<{ type: 'act' | 'mode', data: any } | null>(null);

  constructor() {
    // Виправлений effect - додаємо затримку та запобігаємо зацикленню
    effect(() => {
      const showActModalValue = this.showActModal();

      // Завантажуємо акти тільки після закриття модалки
      if (!showActModalValue) {
        // Додаємо невелику затримку, щоб уникнути конфліктів
        setTimeout(() => {
          this.loadActs();
        }, 100);
        this.editingAct.set(null);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Завантажуємо дані при ініціалізації
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([
      this.loadActs(),
      this.loadModes()
    ]);
  }

  private async loadModes(): Promise<void> {
    try {
      await this.service.getAllModes();
    } catch (error) {
      console.error('Error loading modes:', error);
    }
  }

  async loadActs(): Promise<void> {
    // Перевіряємо, чи вже завантажується
    if (this.loading()) {
      console.log('Завантаження вже виконується, пропускаємо');
      return;
    }

    this.loading.set(true);
    this.error = null;

    try {
      this.acts = await this.service.getAllActsSorted();
      console.log('Loaded acts:', this.acts.length);
    } catch (error: any) {
      this.error = error.message;
      console.error('Error loading acts:', error);
    } finally {
      this.loading.set(false);
    }
  }

  openActModal(): void {
    this.showActModal.set(true);
    this.showModeModal.set(false);
  }

  openModeModal(): void {
    this.showModeModal.set(true);
    this.showActModal.set(false);
  }

  closeActModal(): void {
    this.showActModal.set(false);
  }

  closeModeModal(): void {
    this.showModeModal.set(false);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.deletingItem.set(null);
  }

  // Обробка видалення акта
  onDeleteAct(act: Act): void {
    this.deletingItem.set({
      type: 'act',
      data: act
    });
    this.showConfirmModal.set(true);
  }

  // Обробка видалення мода
  onDeleteMode(mode: any): void {
    this.deletingItem.set({
      type: 'mode',
      data: mode
    });
    this.showConfirmModal.set(true);
  }

  // Підтвердження видалення
  async onConfirmDelete(): Promise<void> {
    const item = this.deletingItem();
    if (!item) return;
    try {
      if (item.type === 'act') {
        // Видалити акт
        await this.service.deleteAct(item.data.id);
        console.log('Act deleted:', item.data.id);
      } else if (item.type === 'mode') {
        // Видалити мод
        // await this.service.deleteMode(item.data.id);
        console.log('Mode deleted:', item.data.id);
      }

      // Оновити дані
      if (item.type === 'act') {
        await this.loadActs();
      } else {
        await this.loadModes();
      }

      // Закрити модалку
      this.closeConfirmModal();
    } catch (error) {
      console.error('Error deleting item:', error);
      // Можна додати повідомлення про помилку
    }
  }
  // Додайте ці методи в ActAndModesEditor

  // Допоміжний метод для отримання назви елемента
  private getItemDisplayName(item: Act | any, type: 'act' | 'mode'): string {
    if (type === 'act') {
      const act = item as Act;
      return act.type === 'Arcana_fight'
        ? `Arcana ${act.name}`
        : `Act ${act.name}`;
    } else {
      return `Mode ${item.name || ''}`.trim();
    }
  }

  // Тепер методи стають простішими
  getConfirmTitle(): string {
    const item = this.deletingItem();
    if (!item) return 'Confirm Delete';

    const displayName = this.getItemDisplayName(item.data, item.type);
    return `Delete ${displayName}`;
  }

  getConfirmMessage(): string {
    const item = this.deletingItem();
    if (!item) return 'Are you sure you want to delete this item?';

    const displayName = this.getItemDisplayName(item.data, item.type);
    return `Are you sure you want to delete ${displayName}? This action cannot be undone.`;
  }

  // Допоміжний метод для відображення типу акта
  private getActTypeDisplay(type: string): string {
    switch (type) {
      case 'Boss_fight': return 'Boss';
      case 'Variation_fight': return 'Variation';
      case 'Arcana_fight': return 'Arcana';
      default: return type;
    }
  }


  onEditAct(act: Act): void {
    this.editingAct.set(act);
    this.showActModal.set(true);
  }

  // Метод для ручного оновлення (через кнопку Refresh)
  refreshActs(): void {
    this.loadActs();
  }
}
