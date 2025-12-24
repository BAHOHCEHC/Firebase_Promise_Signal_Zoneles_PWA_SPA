import { Component, EventEmitter, Input, Output, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  @Input() type: ModalType = 'categories';
  @Input() data: any = null; // Data for editing
  @Input() categories: EnemyCategory[] = []; // Pass categories for dropdown
  @Input() groups: EnemyGroup[] = []; // Pass groups for dropdown if needed globally or filter locally
  @Input() activeCategoryId: string | null = null; // To prefill category

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  public form!: FormGroup;
  public elementTypes: ElementTypeName[] = [
    "empty", "pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"
  ];

  readonly isUploading = signal(false);
  readonly uploadError = signal<string | null>(null);

  constructor(private fb: FormBuilder) { }

  public ngOnInit(): void {
    this.initForm();
    if (this.data) {
      this.form.patchValue(this.data);
    } else {
      // Prefill logic
      if (this.type === 'group' || this.type === 'enemy') {
        if (this.activeCategoryId) {
          this.form.patchValue({ categoryId: this.activeCategoryId });
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
        avatarUrl: [''], // Required but handled by custom control (placeholder +)
        categoryId: ['', Validators.required],
        groupId: ['', Validators.required]
      });
    }
  }

  public onSave(): void {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }

  public onClose(): void {
    this.close.emit();
  }

  // Helper for filtered groups based on selected category in form
  public get filteredGroups(): EnemyGroup[] {
    const catId = this.form.get('categoryId')?.value;
    if (!catId) return [];
    const cat = this.categories.find(c => c.id === catId);
    return cat ? cat.groups : [];
  }

  public selectElement(type: ElementTypeName): void {
    this.form.patchValue({ element: type });
  }

  onAvatarClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onImagePick(event: Event): void {
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

      // Відкладаємо зміни — уникаємо ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.form.patchValue({ avatarUrl: imageUrl });
        this.form.get('avatarUrl')?.setErrors(null);
        this.isUploading.set(false);
        input.value = '';
      }, 0);
    };

    reader.onerror = () => {
      setTimeout(() => {
        this.uploadError.set('Failed to read image file');
        this.isUploading.set(false);
      }, 0);
    };

    reader.readAsDataURL(file);
  }
}
