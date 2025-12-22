import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActModalComponent } from './acts/act-modal.component/act-modal.component';
import { ActsTableComponent } from './acts/acts-table.component/acts-table.component';
import { ModesTableComponent } from './modes/modes-table.component/modes-table.component';
import { ModeModalComponent } from './modes/modes-modal.component/modes-modal.component';
import { ActModsService } from '../../../shared/services/act-mods.service';
import { Act } from '../../../../models/models';

@Component({
  selector: 'app-act-and-modes-editor',
  standalone: true,
  imports: [
    CommonModule,
    ActsTableComponent,
    ModesTableComponent,
    ActModalComponent,
    ModeModalComponent,
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
  readonly editingAct = signal<Act | null>(null);

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
      this.acts = await this.service.getAllActs();
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

  onEditAct(act: Act): void {
    this.editingAct.set(act);
    this.showActModal.set(true);
  }

  // Метод для ручного оновлення (через кнопку Refresh)
  refreshActs(): void {
    this.loadActs();
  }
}
