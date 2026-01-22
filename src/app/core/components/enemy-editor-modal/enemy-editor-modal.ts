import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
  DestroyRef,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ElementTypeName, EnemyCategory, EnemyGroup, ModalType } from '@models/models';


@Component({
  selector: 'app-enemy-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './enemy-editor-modal.html',
  styleUrl: './enemy-editor-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnemyEditorModal implements OnInit {

  @Input() type: ModalType = 'categories';
  @Input() data: any = null;
  @Input() categories: EnemyCategory[] = [];
  @Input() groups: EnemyGroup[] = [];
  @Input() activeCategoryId: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  form!: FormGroup;

  /** ❗ порядок важливий — перший буде дефолтним */
  elementTypes: ElementTypeName[] = [
    'empty',
    'pyro',
    'hydro',
    'electro',
    'cryo',
    'dendro',
    'anemo',
    'geo'
  ];

  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  avatarUrl = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);

  filteredGroups = computed(() => {
    const catId = this.selectedCategoryId();
    if (!catId) return [];
    const cat = this.categories.find(c => c.id === catId);
    return cat ? cat.groups : [];
  });

  isEditMode = computed(() => !!this.data?.id);

  constructor() {
    /** автоселект останньої групи */
    effect(() => {
      if (this.type !== 'enemy' || this.isEditMode()) return;

      const groups = this.filteredGroups();
      if (groups.length && this.form?.get('groupId') && !this.form.get('groupId')?.value) {
        this.form.patchValue({ groupId: groups[groups.length - 1].id });
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.setupSignals();

    if (this.data) {
      this.form.patchValue(this.data);

      if (this.data.categoryId) {
        this.selectedCategoryId.set(this.data.categoryId);
      }
      if (this.data.avatarUrl) {
        this.avatarUrl.set(this.data.avatarUrl);
      }
    } else {
      if ((this.type === 'group' || this.type === 'enemy') && this.activeCategoryId) {
        this.form.patchValue({ categoryId: this.activeCategoryId });
        this.selectedCategoryId.set(this.activeCategoryId);
      }
    }
  }

  /** 🔥 ОСНОВНЕ — дефолтний element */
  private initForm(): void {

    if (this.type === 'categories') {
      this.form = this.fb.group({
        title: ['', Validators.required]
      });
      return;
    }

    if (this.type === 'group') {
      this.form = this.fb.group({
        title: ['', Validators.required],
        categoryId: ['', Validators.required]
      });
      return;
    }

    /** enemy */
    const defaultElement = this.elementTypes[0]; // ← ТУТ МАГІЯ

    this.form = this.fb.group({
      element: [defaultElement, Validators.required],
      name: ['', Validators.required],
      avatarUrl: ['', Validators.required],
      categoryId: ['', Validators.required],
      groupId: ['', Validators.required]
    });
  }

  private setupSignals(): void {
    this.form.get('categoryId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.selectedCategoryId.set(v));

    this.form.get('avatarUrl')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.avatarUrl.set(v));
  }

  selectElement(el: ElementTypeName): void {
    this.form.patchValue({ element: el });
  }

  onAvatarClick(input: HTMLInputElement): void {
    input.click();
  }

  onImagePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Invalid file type');
      return;
    }

    this.isUploading.set(true);
    const reader = new FileReader();

    reader.onload = () => {
      this.form.patchValue({ avatarUrl: reader.result });
      this.isUploading.set(false);
      input.value = '';
    };

    reader.readAsDataURL(file);
  }

  onSave(): void {
    if (this.form.valid) {
      const payload = {
        ...this.form.value,
        id: this.data?.id
      };
      this.save.emit(payload);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onDelete(): void {
    this.delete.emit(this.data);
  }

  onClose(): void {
    this.close.emit();
  }
}
