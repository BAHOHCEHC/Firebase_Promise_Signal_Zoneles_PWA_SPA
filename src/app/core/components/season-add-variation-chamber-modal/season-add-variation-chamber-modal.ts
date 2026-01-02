import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Wave_type } from '../../../../models/models';

@Component({
    selector: 'season-add-variation-chamber-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './season-add-variation-chamber-modal.html',
    styleUrl: './season-add-variation-chamber-modal.scss'
})
export class SeasonAddVariationChamberModal {
    @Output() public close = new EventEmitter<void>();
    @Output() public save = new EventEmitter<{
        wave: Wave_type,
        timer: string,
        name?: string,
        monolit?: boolean
    }>();

    private fb = inject(FormBuilder);

    @Input() public initialData: {
        wave: Wave_type;
        timer: string;
        name?: string;
        monolit?: boolean;
    } | null = null;

    public form = this.fb.group({
        wave: ['1', Validators.required],
        customName: [''],
        timer: [''],
        monolit: [false]
    });

    ngOnInit() {
        if (this.initialData) {
            this.form.patchValue({
                wave: this.initialData.wave as string,
                customName: this.initialData.name || '',
                timer: this.initialData.timer || '',
                monolit: this.initialData.monolit || false
            });
        }
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
