import { Component, EventEmitter, Input, Output, OnInit, signal, computed, ViewChild, ElementRef, inject, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ElementTypeName, EnemyCategory, EnemyGroup } from '../../../../models/models';

export type ModalType = 'categories' | 'group' | 'enemy';

@Component({
  selector: 'app-enemy-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './enemy-editor-modal.component.html',
  styleUrl: './enemy-editor-modal.component.scss'
})
export class EnemyEditorModalComponent implements OnInit {
  @Input() public type: ModalType = 'categories';
  @Input() public data: any = null; // Data for editing
  @Input() public categories: EnemyCategory[] = []; // Pass categories for dropdown
  @Input() public groups: EnemyGroup[] = []; // Pass groups for dropdown if needed globally or filter locally
  @Input() public activeCategoryId: string | null = null; // To prefill category

  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<any>();
  @Output() public delete = new EventEmitter<any>();

  @ViewChild('fileInput', { static: false }) public fileInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  public form!: FormGroup;
  public elementTypes: ElementTypeName[] = [
    "empty", "pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"
  ];

  public readonly isUploading = signal(false);
  public readonly uploadError = signal<string | null>(null);

  // Signal for filtering groups
  public selectedCategoryId = signal<string | null>(null);
  // Signal for avatar preview (reactivity fix for zoneless)
  public avatarUrl = signal<string | null>(null);

  public filteredGroups = computed(() => {
    const catId = this.selectedCategoryId();
    if (!catId) return [];
    const cat = this.categories.find(c => c.id === catId);
    return cat ? cat.groups : [];
  });

  public isEditMode = computed(() => {
    return !!this.data && !!this.data.id;
  });

  // Effect to auto-select last group
  constructor() {
    effect(() => {
      const groups = this.filteredGroups();
      if (this.type === 'enemy' && groups.length > 0 && !this.data?.id) {
        // Auto-select last group if creating new enemy
        const lastGroup = groups[groups.length - 1];
        // We need to wait for form to be ready or just set it
        // Use setTimeout to ensure form is ready if this runs too early, but effect runs asynchronously usually
        // However, form might not be initialized in constructor.
        // Safer to check this.form
        if (this.form && this.form.get('groupId')) {
          const currentVal = this.form.get('groupId')?.value;
          if (!currentVal) {
            this.form.patchValue({ groupId: lastGroup.id });
          }
        }
      }
    });
  }

  public ngOnInit(): void {
    this.initForm();
    this.setupFormSignalSync();

    if (this.data) {
      this.form.patchValue(this.data);
      // Sync signal with initial data
      if (this.data.categoryId) {
        this.selectedCategoryId.set(this.data.categoryId);
      }
      if (this.data.avatarUrl) {
        this.avatarUrl.set(this.data.avatarUrl);
      }
    } else {
      // Prefill logic
      if (this.type === 'group' || this.type === 'enemy') {
        if (this.activeCategoryId) {
          this.form.patchValue({ categoryId: this.activeCategoryId });
          this.selectedCategoryId.set(this.activeCategoryId);
        }
      }
    }
  }

  private initForm(): void {
    if (this.type === 'categories') {
      this.form = this.fb.group({
        title: ['', Validators.required]
      });
    } else if (this.type === 'group') {
      this.form = this.fb.group({
        title: ['', Validators.required],
        categoryId: ['', Validators.required]
      });
    } else if (this.type === 'enemy') {
      this.form = this.fb.group({
        element: ['', Validators.required],
        name: ['', Validators.required],
        avatarUrl: ['', Validators.required], // STRICT VALIDATION
        categoryId: ['', Validators.required],
        groupId: ['', Validators.required]
      });
    }
  }

  private setupFormSignalSync(): void {
    const categoryIdControl = this.form.get('categoryId');
    if (categoryIdControl) {
      categoryIdControl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(id => {
          this.selectedCategoryId.set(id);
        });
    }

    const avatarUrlControl = this.form.get('avatarUrl');
    if (avatarUrlControl) {
      avatarUrlControl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(url => {
          this.avatarUrl.set(url);
        });
    }
  }

  public onSave(): void {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    } else {
      this.form.markAllAsTouched(); // Show validation errors
    }
  }

  public onDelete(): void {
    this.delete.emit();
  }

  public onClose(): void {
    this.close.emit();
  }

  public selectElement(type: ElementTypeName): void {
    this.form.patchValue({ element: type });
  }

  public onAvatarClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  public onImagePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Image size should be less than 5MB');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const imageUrl = e.target?.result as string;

      this.form.patchValue({ avatarUrl: imageUrl });
      this.form.get('avatarUrl')?.setErrors(null);
      this.isUploading.set(false);
      input.value = '';
    };

    reader.onerror = () => {
      this.uploadError.set('Failed to read image file');
      this.isUploading.set(false);
    };

    reader.readAsDataURL(file);
  }
}
