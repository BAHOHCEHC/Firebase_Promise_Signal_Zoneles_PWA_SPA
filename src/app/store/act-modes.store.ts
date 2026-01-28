import { signal, computed, Injectable } from '@angular/core';
import { Act, Mode } from '../../models/models';
import { IndexedDbUtil } from '@utils/indexed-db';

@Injectable({
  providedIn: 'root',
})
export class ActModesStore {
  /** АКТИ */
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

  /** Обробка актів для кешування зображень ворогів */
  private async processActImages(acts: Act[]): Promise<Act[]> {
    return Promise.all(acts.map(async (act) => {
      const processedAct = { ...act };

      // Допоміжна функція для обробки ворогів
      const processEnemies = async (enemies: any[]) => {
        return Promise.all(enemies.map(async (enemy) => {
          const e = { ...enemy };
          if (e.avatarUrl && !e.avatarUrl.startsWith('data:')) {
            try {
              e.avatarUrl = await IndexedDbUtil.loadImageAndCache(e.avatarUrl, e.avatarUrl);
            } catch (err) {
              console.error(`Failed to cache avatar for enemy ${e.name}`, err);
            }
          }
          if (e.element?.iconUrl && !e.element.iconUrl.startsWith('data:')) {
             try {
               const newUrl = await IndexedDbUtil.loadImageAndCache(e.element.iconUrl, e.element.iconUrl);
               e.element = { ...e.element, iconUrl: newUrl };
             } catch (err) {
               console.error(`Failed to cache element for enemy ${e.name}`, err);
             }
          }
           return e;
        }));
      };

      // 1. Вибір ворогів
      if (processedAct.enemy_selection?.length) {
         processedAct.enemy_selection = await processEnemies(processedAct.enemy_selection);
      }

      // 2. Варіації -> Хвилі -> Включені вороги
      if (processedAct.variations?.length) {
        processedAct.variations = await Promise.all(processedAct.variations.map(async (v) => {
           const processedVar = { ...v };
           if (processedVar.waves?.length) {
              processedVar.waves = await Promise.all(processedVar.waves.map(async (w) => {
                 const processedWave = { ...w };
                 if (processedWave.included_enemy?.length) {
                    processedWave.included_enemy = await processEnemies(processedWave.included_enemy);
                 }
                 return processedWave;
              }));
           }
           return processedVar;
        }));
      }

      return processedAct;
    }));
  }

  async setActs(acts: Act[]) {
    const processed = await this.processActImages(acts);
    this.acts.set(processed);
    this.saveToIndexedDb();
  }

  async addAct(act: Act) {
    const [processed] = await this.processActImages([act]);
    this.acts.set([...this.acts(), processed]);
    this.saveToIndexedDb();
  }

  removeAct(id: string) {
    this.acts.set(this.acts().filter(a => a.id !== id));
    this.saveToIndexedDb();
  }

  async updateAct(act: Act) {
    const [processed] = await this.processActImages([act]);
    this.acts.set(
      this.acts().map(a => a.id === processed.id ? processed : a)
    );
    this.saveToIndexedDb();
  }

  /** РЕЖИМИ */
  readonly modes = signal<Mode[]>([]);

  /** Обробка режимів для забезпечення кешування зображень їх кімнат (актів) */
  private async processModeImages(modes: Mode[]): Promise<Mode[]> {
      return Promise.all(modes.map(async (mode) => {
          const m = { ...mode };
          if (m.chambers?.length) {
              m.chambers = await this.processActImages(m.chambers);
          }
          return m;
      }));
  }

  async setModes(modes: Mode[]) {
    const processed = await this.processModeImages(modes);
    this.modes.set(processed);
    this.saveToIndexedDb();
  }

  async addMode(mode: Mode) {
    const [processed] = await this.processModeImages([mode]);
    this.modes.set([...this.modes(), processed]);
    this.saveToIndexedDb();
  }

  removeMode(id: string) {
    this.modes.set(this.modes().filter(m => m.id !== id));
    this.saveToIndexedDb();
  }

  async updateMode(mode: Mode) {
    const [processed] = await this.processModeImages([mode]);
    this.modes.set(
      this.modes().map(m => m.id === processed.id ? processed : m)
    );
    this.saveToIndexedDb();
  }

  readonly hasActs = computed(() => this.acts().length > 0);
  readonly hasModes = computed(() => this.modes().length > 0);
}
