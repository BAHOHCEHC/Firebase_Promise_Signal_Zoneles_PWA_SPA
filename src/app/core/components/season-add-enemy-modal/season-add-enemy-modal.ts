import { Component, EventEmitter, Input, Output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Act_options, Enemy, EnemyCategory, EnemyGroup, ElementTypeName } from '../../../../models/models';

@Component({
  selector: 'app-season-add-enemy-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './season-add-enemy-modal.html',
  styleUrl: './season-add-enemy-modal.scss'
})
export class SeasonAddEnemyModal implements OnInit {
  @Input() public actOptions: Act_options = {}; // Determines which fields to show
  @Input() public categories: EnemyCategory[] = [];

  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<{
    enemy: Enemy,
    options: {
      amount?: string;
      timer?: string;
      defeat?: string;
      special_type?: boolean;
    }
  }>();

  private fb = inject(FormBuilder);
  public form!: FormGroup;

  // State management for enemy selection
  public selectedCategoryId = signal<string | null>(null);
  public groups = signal<EnemyGroup[]>([]);
  public selectedGroupId = signal<string | null>(null);
  public enemies = signal<Enemy[]>([]); // This would need to be populated based on group

  // Note: The prompt implies using existing categories/groups/enemies collections logic.
  // Since we don't have direct access to all logic here, we simulate or expect inputs.
  // Actually, standard `app-enemy-editor-modal` just edits enemy.
  // Here we need to SELECT an enemy.
  // "In Act.enemy_selection are added those units we selected in modal"
  // So we need a way to PICK an enemy.
  // I will assume we have `categories` passed.
  // And we need to fetch groups/enemies based on selection?
  // Or maybe we just pass ALL data? Use `categories` which has `groups`.
  // What about enemies? `Enemy` has `groupId`.
  // For simplicity, I'll update the component to accept all needed data or assume we can filter.
  // I will check if I need to load enemies.
  // `SeasonService` operates on `season_details`.
  // Maybe I need `EnemiesService` here?
  // I'll stick to Inputs for data to keep it dumb if possible.

  @Input() public allEnemies: Enemy[] = []; // Pass all enemies for filtering

  public filteredGroups = signal<EnemyGroup[]>([]);
  public filteredEnemies = signal<Enemy[]>([]);
  public selectedEnemy = signal<Enemy | null>(null);

  ngOnInit() {
    this.initForm();

    // Watch category change
    this.form.get('categoryId')?.valueChanges.subscribe(catId => {
      this.selectedCategoryId.set(catId);
      const cat = this.categories.find(c => c.id === catId);
      this.filteredGroups.set(cat ? cat.groups : []);
      this.form.patchValue({ groupId: '', enemyId: '' });
      this.selectedEnemy.set(null);
    });

    // Watch group change
    this.form.get('groupId')?.valueChanges.subscribe(groupId => {
      this.selectedGroupId.set(groupId);
      // Filter enemies by group
      const enemiesInGroup = this.allEnemies.filter(e => e.groupId === groupId);
      this.filteredEnemies.set(enemiesInGroup);
      if (enemiesInGroup.length > 0) {
        // Maybe auto select first?
      }
      this.form.patchValue({ enemyId: '' });
      this.selectedEnemy.set(null);
    });

    // Watch enemy change
    this.form.get('enemyId')?.valueChanges.subscribe(enemyId => {
      const enemy = this.allEnemies.find(e => e.id === enemyId) || null;
      this.selectedEnemy.set(enemy);
    });
  }

  private initForm() {
    this.form = this.fb.group({
      categoryId: ['', Validators.required],
      groupId: ['', Validators.required],
      enemyId: ['', Validators.required],
      amount: [''],
      timer: [''],
      defeat: [''],
      special_type: [false]
    });

    // Validations based on actOptions
    if (this.actOptions.amount) this.form.get('amount')?.setValidators(Validators.required);
    if (this.actOptions.timer) this.form.get('timer')?.setValidators(Validators.required);
    if (this.actOptions.defeat) this.form.get('defeat')?.setValidators(Validators.required);
    // special_type is boolean, no required validator needed usually if checkbox
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`; // Assuming path
  }

  public onSave() {
    if (this.form.valid && this.selectedEnemy()) {
      const formVal = this.form.value;
      this.save.emit({
        enemy: this.selectedEnemy()!,
        options: {
          amount: formVal.amount,
          timer: formVal.timer,
          defeat: formVal.defeat,
          special_type: formVal.special_type
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  public onClose() {
    this.close.emit();
  }
}
