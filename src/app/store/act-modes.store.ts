import { signal, computed, Injectable } from '@angular/core';
import { Act, Mode } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class ActModesStore {
  /** ACTS */
  readonly acts = signal<Act[]>([]);

  addAct(act: Act) {
    this.acts.set([...this.acts(), act]);
  }

  removeAct(id: string) {
    this.acts.set(this.acts().filter(a => a.id !== id));
  }

  updateAct(act: Act) {
    this.acts.set(
      this.acts().map(a => a.id === act.id ? act : a)
    );
  }

  /** MODES */
  readonly modes = signal<Mode[]>([]);

  addMode(mode: Mode) {
    this.modes.set([...this.modes(), mode]);
  }

  removeMode(id: string) {
    this.modes.set(this.modes().filter(m => m.id !== id));
  }

  updateMode(mode: Mode) {
    this.modes.set(
      this.modes().map(m => m.id === mode.id ? mode : m)
    );
  }

  readonly hasActs = computed(() => this.acts().length > 0);
  readonly hasModes = computed(() => this.modes().length > 0);
}
