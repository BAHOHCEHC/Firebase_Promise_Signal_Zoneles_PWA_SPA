import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Season_details, Character, Act, Variation, Wave, ElementTypeName, ElementType, Act_options, Enemy, Wave_type, Enemy_options } from '../../../../models/models';
import { SeasonAddEnemyModal } from '../../../core/components/season-add-enemy-modal/season-add-enemy-modal';
import { SeasonAddVariationChamberModal } from '../../../core/components/season-add-variation-chamber-modal/season-add-variation-chamber-modal';
import { SeasonCharactersModal } from '../../../core/components/season-characters-modal/season-characters-modal';
import { SeasonElementTypeModal } from '../../../core/components/season-element-type-modal/season-element-type-modal';
import { CharacterService } from '../../../shared/services/charater.service';
import { EnemiesService } from '../../../shared/services/enemies.service';
import { SeasonService } from '../../../shared/services/season.service';


@Component({
  selector: 'app-seasons-editor',
  standalone: true,
  imports: [
    CommonModule,
    SeasonElementTypeModal,
    SeasonCharactersModal,
    SeasonAddEnemyModal,
    SeasonAddVariationChamberModal
  ],
  templateUrl: './seasons-editor.html',
  styleUrl: './seasons-editor.scss'
})
export class SeasonsEditorComponent implements OnInit {
  private seasonService = inject(SeasonService);
  private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService); // Public to access signals in template if needed, or mapped

  public readonly OPENING_CHARACTER_LIMIT = 6;
  public readonly SPECIAL_GUEST_LIMIT = 4;

  // State
  public seasonDetails = signal<Season_details>({
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: []
  });

  public allCharacters = signal<Character[]>([]);
  public isEditMode = signal(false); // "Reset" button clears data, maybe logic differs? Prompt says "Update Edit button to Reset - erasing all data"
  // Actually, prompt: "button 'Edit' changes to 'Reset' - erasing all data...". This implies if data exists, it says Reset. If empty, maybe Edit? No, "Edit" usually means "Enable Editing".
  // But here prompt says: "button 'Edit' changes to 'Reset' - erasing all data from collection season_details".
  // This likely means there is a button that toggles or performs action.
  // I will assume if data exists (loaded), show "Reset". If not, maybe nothing or "Load"?
  // But data is loaded on init.
  // Let's implement "Reset" button logic.

  // Modals state
  public showElementModal = signal(false);
  public showCharactersModal = signal(false);
  public showAddEnemyModal = signal(false);
  public showVariationModal = signal(false);

  // Modal Context
  public characterModalMode = signal<'opening' | 'special'>('opening');
  public currentActForEnemy = signal<Act | null>(null);
  public currentWaveForEnemy = signal<Wave | null>(null);
  public currentVariationForEnemy = signal<Variation | null>(null);
  public currentInitialEnemies = computed(() => {
    const wave = this.currentWaveForEnemy();
    if (wave) return wave.included_enemy;
    return [];
  });
  public currentInitialOptions = computed(() => {
    const act = this.currentActForEnemy();
    if (act?.type !== 'Variation_fight') {
      return act?.enemy_options || {};
    }
    const variation = this.currentVariationForEnemy();
    if (variation) {
      return {
        timer: variation.timer,
        // For variations, amount/defeat/special_type are usually set per wave/enemy in processedEnemies
        // but if we want to pre-fill the modal with variation-level timer:
      };
    }
    return {};
  });
  public currentVariationIndex = signal<number>(-1);
  public currentActForVariation = signal<Act | null>(null);

  public currentInitialVariation = computed(() => {
    const act = this.currentActForVariation();
    const idx = this.currentVariationIndex();
    if (act && idx !== -1 && act.variations) {
      return act.variations[idx];
    }
    return null;
  });

  // Computed
  public hasData = computed(() => {
    // Check if we have meaningful data
    const d = this.seasonDetails();
    return d.elemental_type_limided.length > 0 || d.opening_characters.length > 0 || d.special_guests.length > 0 || d.acts.some(a => a.enemy_selection.length > 0 || a.variations.length > 0);
  });

  public bossArcanaActs = computed(() => {
    // Filter acts by type
    return this.seasonDetails().acts.filter(a => a.type === 'Boss_fight' || a.type === 'Arcana_fight');
  });

  public variationActs = computed(() => {
    return this.seasonDetails().acts.filter(a => a.type === 'Variation_fight');
  });

  // Element helpers
  public elementTypes: ElementTypeName[] = ["pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"];
  public activeElements = computed(() => {
    return new Set(this.seasonDetails().elemental_type_limided.map(e => e.name));
  });

  async ngOnInit() {
    // Init services
    await this.enemiesService.initializeData();

    // Load chars
    const chars = await this.characterService.getAllCharacters();
    this.allCharacters.set(chars);

    // Load Season Details
    const details = await this.seasonService.loadSeasonDetails();
    if (details) {
      // If loaded, we might need to merge with existing acts if structure changed?
      // But prompt says "at initialization loads data from collection season_details for additional setting of acts created earlier".
      // So we should verify acts match known acts?
      // Assuming season_details acts are the source of truth for this editor.
      // However, if acts were added in "act-and-modes-editor", we should probably fetch ALL acts and see if season_details has them.
      // If season_details is partial, we fill it.
      // For now, let's load what we have.

      // We also need to fetch acts from 'acts' collection to ensure we have the structure for all acts (e.g. name, type)
      // because season_details might only store overrides? Or full objects?
      // Implementation plan assumed season_details stores full Act objects or linked.
      // I will fetch all ACTS to be sure we have the structure to display.
      const allActs = await this.seasonService.getAllActs();

      // Merge logic: use season details acts if present, else use allActs (but initialized empty for season-specifics)
      // Actually, if we reset, we should probably reload Acts from 'acts' collection with empty season settings.

      if (details.acts && details.acts.length > 0) {
        // Ensure we have all acts from DB, maybe some new ones appeared
        const mergedActs = allActs.map(dbAct => {
          const savedAct = details.acts.find(a => a.id === dbAct.id);
          if (savedAct) {
            return { ...dbAct, ...savedAct }; // Prefer saved details but keep ref
          }
          return dbAct;
        });
        this.seasonDetails.set({ ...details, acts: mergedActs });
      } else {
        this.seasonDetails.update(s => ({ ...s, acts: allActs }));
      }
    } else {
      // New season setup
      const allActs = await this.seasonService.getAllActs();
      this.seasonDetails.update(s => ({ ...s, acts: allActs }));
    }
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`; // Assuming path
  }

  // --- Actions ---

  public onReset() {
    if (confirm('Are you sure you want to reset all data?')) {
      this.seasonService.resetSeasonDetails();
      // Reload acts fresh
      this.seasonService.getAllActs().then(acts => {
        this.seasonDetails.set({
          elemental_type_limided: [],
          opening_characters: [],
          special_guests: [],
          acts: acts
        });
      });
    }
  }

  public onSavePage() {
    this.seasonService.saveSeasonDetails(this.seasonDetails());
    alert('Saved!');
  }

  // --- Element Modal ---
  public openElementModal() {
    this.showElementModal.set(true);
  }

  public closeElementModal() {
    this.showElementModal.set(false);
  }

  public onSaveElements(elements: ElementType[]) {
    this.seasonDetails.update(prev => ({ ...prev, elemental_type_limided: elements }));
    this.closeElementModal();
  }

  // --- Character Modal ---
  public openCharacterModal(mode: 'opening' | 'special') {
    this.characterModalMode.set(mode);
    this.showCharactersModal.set(true);
  }

  public get currentCharacterSelection(): Character[] {
    return this.characterModalMode() === 'opening'
      ? this.seasonDetails().opening_characters
      : this.seasonDetails().special_guests;
  }

  public get currentCharacterLimit(): number {
    return this.characterModalMode() === 'opening'
      ? this.OPENING_CHARACTER_LIMIT
      : this.SPECIAL_GUEST_LIMIT;
  }

  public get currentCharacterTitle(): string {
    return this.characterModalMode() === 'opening'
      ? 'Select this season Opening characters'
      : 'Select this season Special guests';
  }

  public closeCharacterModal() {
    this.showCharactersModal.set(false);
  }

  public onSaveCharacters(chars: Character[]) {
    const mode = this.characterModalMode();
    this.seasonDetails.update(prev => ({
      ...prev,
      [mode === 'opening' ? 'opening_characters' : 'special_guests']: chars
    }));
    this.closeCharacterModal();
  }

  // --- Enemy Modal (Boss/Arcana) ---
  public openAddEnemyModal(act: Act) {
    this.currentActForEnemy.set(act);
    this.currentVariationForEnemy.set(null);
    this.currentWaveForEnemy.set(null);

    // For Boss/Arcana, we automatically target variation[0].wave[0] for initialization
    if (act.type !== 'Variation_fight') {
      if (!act.variations || act.variations.length === 0) {
        act.variations = [{
          timer: act.enemy_options?.timer || '',
          wave: '1',
          waves: [{ waveCount: 0, included_enemy: [] }]
        }];
      }
      this.currentVariationForEnemy.set(act.variations[0]);
      this.currentWaveForEnemy.set(act.variations[0].waves[0]);
    }

    this.showAddEnemyModal.set(true);
  }

  public get currentActOptions(): Act_options {
    // Based on prompt "act.options boolean ... Amount,Defeat,Timer(type string) affects acts.enemy_options"
    // Wait, Act.options is boolean flags (amount?: boolean).
    // Act.enemy_options is the values (amount?: string).
    // The modal needs the boolean flags to know what to show.
    // Act interface has `options: Act_options`.
    return this.currentActForEnemy()?.options as any || {}; // Act_options matches roughly
  }

  public closeAddEnemyModal() {
    this.showAddEnemyModal.set(false);
    this.currentActForEnemy.set(null);
  }

  // public onSaveEnemy(data: { enemy: Enemy, options: any }) {
  public onSaveEnemy(data: any) {
    const act = this.currentActForEnemy();
    if (!act) return;

    const processedEnemies = data.enemies.map((e: any) => ({
      ...e,
      quantity: data.options.amount ? parseInt(data.options.amount) : 1,
      specialMark: !!data.options.special_type
    }));

    if (act.type === 'Variation_fight') {
      const variation = this.currentVariationForEnemy();
      const wave = this.currentWaveForEnemy();
      if (variation && wave) {
        wave.included_enemy = [...processedEnemies];
      }
    } else {
      // Boss/Arcana: Ensure internal structure exists
      if (!act.variations || act.variations.length === 0) {
        act.variations = [{
          timer: data.options.timer || '',
          wave: '1',
          waves: [{ waveCount: 0, included_enemy: [] }]
        }];
      }

      const variation = act.variations[0];
      if (!variation.waves) variation.waves = [{ waveCount: 0, included_enemy: [] }];

      variation.waves[0].included_enemy = [...processedEnemies];
      variation.timer = data.options.timer || '';

      // Legacy sync
      act.enemy_selection = [...processedEnemies];
      act.enemy_options = { ...data.options };
    }

    this.seasonDetails.update(d => ({ ...d }));
    this.closeAddEnemyModal();
  }

  // --- Variation Modal ---
  public openVariationModal(act: Act, vIdx: number = -1) {
    this.currentActForVariation.set(act);
    this.currentVariationIndex.set(vIdx);
    this.showVariationModal.set(true);
  }

  public closeVariationModal() {
    this.showVariationModal.set(false);
    this.currentActForVariation.set(null);
    this.currentVariationIndex.set(-1);
  }

  public onSaveVariation(data: { wave: Wave_type, timer: string, name?: string, monolit?: boolean }) {
    const act = this.currentActForVariation();
    if (!act) return;

    if (!act.variations) act.variations = [];

    const vIdx = this.currentVariationIndex();

    if (vIdx !== -1) {
      // Update existing
      const variation = act.variations[vIdx];
      variation.timer = data.timer;
      variation.wave = data.wave;
      variation.name = data.name;
      variation.monolit = data.monolit;

      // Re-generate waves if wave count changed?
      // For now, let's keep existing enemies if possible or reset if count differs
      const newWaveCount = data.wave === 'custom' ? 1 : parseInt(data.wave);
      if (variation.waves.length !== newWaveCount) {
        const newWaves: Wave[] = [];
        for (let i = 0; i < newWaveCount; i++) {
          newWaves.push({ waveCount: i, included_enemy: [] });
        }
        variation.waves = newWaves;
      }
    } else {
      // Add new
      const waveCount = data.wave === 'custom' ? 1 : parseInt(data.wave);
      const waves: Wave[] = [];
      for (let i = 0; i < waveCount; i++) {
        waves.push({ waveCount: i, included_enemy: [] });
      }

      const newVariation: Variation = {
        timer: data.timer,
        wave: data.wave,
        waves: waves,
        name: data.name,
        monolit: data.monolit
      };

      act.variations.push(newVariation);
    }

    this.seasonDetails.update(d => ({ ...d }));
    this.closeVariationModal();
  }

  public openAddEnemyToWave(act: Act, variationIndex: number, waveIndex: number) {
    if (!act.variations || !act.variations[variationIndex]) return;
    const variation = act.variations[variationIndex];
    if (!variation.waves || !variation.waves[waveIndex]) return;

    this.currentActForEnemy.set(act);
    this.currentVariationForEnemy.set(variation);
    this.currentWaveForEnemy.set(variation.waves[waveIndex]);
    this.showAddEnemyModal.set(true);
  }

  // --- Helpers ---
  public getVariationName(act: Act): string {
    const s = act.variation_fight_settings;
    if (!s) return '';
    if (s.wave === 'custom') return s.name || 'Custom';
    return `Wave ${s.wave}`; // Or just "Wave 1 - 2 - 3"? Prompt says: "Wave" + variation_fight_settings.wave
  }

  // --- COMPUTED ---

  public bossActs = computed(() =>
    this.seasonDetails().acts.filter(a => a.type === 'Boss_fight')
  );

  public arcanaActs = computed(() =>
    this.seasonDetails().acts.filter(a => a.type === 'Arcana_fight')
  );

}
