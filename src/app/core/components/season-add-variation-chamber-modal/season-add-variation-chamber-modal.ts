import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Wave_type, Variation } from '../../../../models/models';

interface VariationModalData {
    wave: Wave_type;
    timer: string;
    name?: string;
    monolit?: boolean;
}

@Component({
    selector: 'season-add-variation-chamber-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './season-add-variation-chamber-modal.html',
    styleUrl: './season-add-variation-chamber-modal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonAddVariationChamberModal {
    public initialData = input<VariationModalData | null>(null);

    @Output() public close = new EventEmitter<void>();
    @Output() public save = new EventEmitter<{
        wave: Wave_type,
        timer: string,
        name?: string,
        monolit?: boolean
    }>();

    private fb = inject(FormBuilder);

    public form = this.fb.group({
        wave: ['1', Validators.required],
        customName: [{ value: '', disabled: true }],
        timer: [''],
        monolit: [false]
    });

    constructor() {
        effect(() => {
            const data = this.initialData();
            if (data) {
                const isCustom = data.wave === 'custom';
                this.form.patchValue({
                    wave: data.wave || '1',
                    customName: data.name || '',
                    timer: data.timer || '',
                    monolit: !!data.monolit
                });

                if (isCustom) {
                    this.form.get('customName')?.enable();
                } else {
                    this.form.get('customName')?.disable();
                }

                // Timer/Monolit mutual exclusion
                if (data.timer) {
                    this.form.get('monolit')?.disable();
                    this.form.get('timer')?.enable();
                } else if (data.monolit) {
                    this.form.get('timer')?.disable();
                    this.form.get('monolit')?.enable();
                } else {
                    this.form.get('timer')?.enable();
                    this.form.get('monolit')?.enable();
                }
            } else {
                this.form.reset({
                    wave: '1',
                    customName: '',
                    timer: '',
                    monolit: false
                });
                this.form.get('customName')?.disable();
                this.form.get('timer')?.enable();
                this.form.get('monolit')?.enable();
            }
        });

        // Listen for wave changes to toggle customName disabled state
        this.form.get('wave')?.valueChanges.subscribe(value => {
            if (value === 'custom') {
                this.form.get('customName')?.enable();
            } else {
                this.form.get('customName')?.disable();
                this.form.get('customName')?.setValue('');
            }
        });

        // Timer mutual exclusion
        this.form.get('timer')?.valueChanges.subscribe(value => {
            if (value && value.trim() !== '') {
                this.form.get('monolit')?.disable({ emitEvent: false });
                this.form.get('monolit')?.setValue(false, { emitEvent: false });
            } else {
                this.form.get('monolit')?.enable({ emitEvent: false });
            }
        });

        // Monolit mutual exclusion
        this.form.get('monolit')?.valueChanges.subscribe(value => {
            if (value) {
                this.form.get('timer')?.disable({ emitEvent: false });
                this.form.get('timer')?.setValue('', { emitEvent: false });
            } else {
                this.form.get('timer')?.enable({ emitEvent: false });
            }
        });
    }

    public onClose(): void {
        this.close.emit();
    }

    public onSave(): void {
        if (this.form.valid) {
            const val = this.form.value;
            this.save.emit({
                wave: val.wave as Wave_type,
                timer: val.timer || '',
                name: val.wave === 'custom' ? (val.customName || '') : undefined,
                monolit: val.monolit || false
            });
        } else {
            this.form.markAllAsTouched();
        }
    }
}
