import { Component, EventEmitter, Output, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.html',
  styleUrls: ['./confirm-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModal {
  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  // Вхідні параметри для налаштування модалки
  @Input() title: string = 'Confirm Delete';
  @Input() message: string = 'Are you sure you want to delete this item?';
  @Input() confirmButtonText: string = 'Delete';
  @Input() cancelButtonText: string = 'Cancel';
  @Input() type: 'danger' | 'warning' | 'info' = 'danger';

  // Закриття при кліку на оверлей
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  // Підтвердження видалення
  onConfirm(): void {
    this.confirm.emit();
  }

  // Скасування
  onCancel(): void {
    this.close.emit();
  }

  // Отримання класу для кнопки підтвердження
  getConfirmButtonClass(): string {
    switch (this.type) {
      case 'danger':
        return 'btn danger';
      case 'warning':
        return 'btn warning';
      case 'info':
        return 'btn primary';
      default:
        return 'btn danger';
    }
  }

  // Отримання іконки для типу
  getIcon(): string {
    switch (this.type) {
      case 'danger':
        return 'warning';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'warning';
    }
  }
}
