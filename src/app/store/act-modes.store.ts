import { signal, computed, Injectable } from '@angular/core';
import { Act, Mode } from '../../models/models';
import { IndexedDbUtil } from '@utils/indexed-db';

@Injectable({
  providedIn: 'root',
})
export class ActModesStore {
  /** ACTS */
  readonly acts = signal<Act[]>([]);

  constructor() {
    this.loadFromIndexedDb();
  }

  private async saveToIndexedDb() {
    try {
      await IndexedDbUtil.set('ActsData', this.acts());
      await IndexedDbUtil.set('ModesData', this.modes());
    } catch (e) {
      console.error('Failed to save acts/modes to IndexedDB', e);
    }
  }

  private async loadFromIndexedDb() {
    try {
      const storedActs = await IndexedDbUtil.get<Act[]>('ActsData');
      if (storedActs) {
        this.acts.set(storedActs);
      }
      const storedModes = await IndexedDbUtil.get<Mode[]>('ModesData');
      if (storedModes) {
        this.modes.set(storedModes);
      }
    } catch (e) {
      console.error('Failed to load acts/modes from IndexedDB', e);
    }
  }

  setActs(acts: Act[]) {
    this.acts.set(acts);
    this.saveToIndexedDb();
  }

  addAct(act: Act) {
    this.acts.set([...this.acts(), act]);
    this.saveToIndexedDb();
  }

  removeAct(id: string) {
    this.acts.set(this.acts().filter(a => a.id !== id));
    this.saveToIndexedDb();
  }

  updateAct(act: Act) {
    this.acts.set(
      this.acts().map(a => a.id === act.id ? act : a)
    );
    this.saveToIndexedDb();
  }

  /** MODES */
  readonly modes = signal<Mode[]>([]);

  setModes(modes: Mode[]) {
    this.modes.set(modes);
    this.saveToIndexedDb();
  }

  addMode(mode: Mode) {
    this.modes.set([...this.modes(), mode]);
    this.saveToIndexedDb();
  }

  removeMode(id: string) {
    this.modes.set(this.modes().filter(m => m.id !== id));
    this.saveToIndexedDb();
  }

  updateMode(mode: Mode) {
    this.modes.set(
      this.modes().map(m => m.id === mode.id ? mode : m)
    );
    this.saveToIndexedDb();
  }

  readonly hasActs = computed(() => this.acts().length > 0);
  readonly hasModes = computed(() => this.modes().length > 0);
}
