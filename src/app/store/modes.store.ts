import { signal } from '@angular/core';
import { Mode } from '../../models/models';


class ModesStore {
  modes = signal<Mode[]>([]);

  add(mode: Mode) {
    this.modes.set([...this.modes(), mode]);
  }

  remove(id: string) {
    this.modes.set(this.modes().filter(m => m.id !== id));
  }
}

export const modesStore = new ModesStore();
