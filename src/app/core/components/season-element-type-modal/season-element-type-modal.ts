import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElementTypeName, ElementType } from '../../../../models/models';

@Component({
  selector: 'app-season-element-type-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './season-element-type-modal.html',
  styleUrl: './season-element-type-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeasonElementTypeModal {
  @Input() public set selectedElements(value: ElementType[]) {
    this.currentSelection.set(new Set(value.map((e) => e.name)));
  }
  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<ElementType[]>();

  public readonly elementTypes: ElementTypeName[] = [
    'pyro',
    'hydro',
    'electro',
    'cryo',
    'dendro',
    'anemo',
    'geo',
  ];

  public currentSelection = signal<Set<ElementTypeName>>(new Set());
  public limit = 3;

  public activeCount = computed(() => this.currentSelection().size);

  // Комп'ютед властивість для визначення, чи потрібно затемнювати неактивні кнопки
  public shouldDimInactive = computed(() => {
    const count = this.activeCount();
    // Затемнюємо тільки якщо є хоча б один обраний елемент
    // Але не затемнюємо якщо обраних 0
    return count > 0;
  });

  // Чи досягнуто ліміт
  public isLimitReached = computed(() => this.activeCount() >= this.limit);

  public toggleElement(type: ElementTypeName): void {
    const current = new Set(this.currentSelection());

    if (current.has(type)) {
      // Якщо елемент вже обраний - знімаємо вибір
      current.delete(type);
    } else {
      // Якщо елемент не обраний і не досягнуто ліміт - додаємо
      if (!this.isLimitReached()) {
        current.add(type);
      }
    }

    this.currentSelection.set(current);
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`;
  }

  public onSave(): void {
    const selected = Array.from(this.currentSelection()).map(
      (name) =>
        ({
          name,
          iconUrl: this.getElementIconPath(name),
        }) as ElementType,
    );
    this.save.emit(selected);
  }

  public onClose(): void {
    this.close.emit();
  }
}
