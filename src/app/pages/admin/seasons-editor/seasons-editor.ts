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
import { sanitizeChars } from '../../../../utils/sanitizeChars';


@Component({
  selector: 'app-seasons-editor',
  standalone: true,
  imports: [
    CommonModule,
    SeasonAddEnemyModal,
    SeasonAddVariationChamberModal,
    SeasonCharactersModal,
    SeasonElementTypeModal
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

  // --- State Signals ---
  public seasonDetails = signal<Season_details>({
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: []
  });

  public allCharacters = signal<Character[]>([]);
  public isEditMode = signal(false);

  // --- Modals State ---
  public showElementModal = signal(false);
  public showCharactersModal = signal(false);
  public showAddEnemyModal = signal(false);
  public showVariationModal = signal(false);
  public resetInProgress = signal(false);

  // --- Modal Context Signals ---
  public characterModalMode = signal<'opening' | 'special'>('opening');
  public currentActForEnemy = signal<Act | null>(null);
  public currentWaveForEnemy = signal<Wave | null>(null);
  public currentVariationForEnemy = signal<Variation | null>(null);
  public currentVariationIndex = signal<number>(-1);
  public currentActForVariation = signal<Act | null>(null);

  // --- Computed Selections ---
  public currentInitialEnemies = computed(() => this.currentWaveForEnemy()?.included_enemy ?? []);

  public currentInitialOptions = computed(() => {
    const act = this.currentActForEnemy();
    if (act?.type !== 'Variation_fight') return act?.enemy_options || {};

    const variation = this.currentVariationForEnemy();
    return variation ? { timer: variation.timer } : {};
  });

  public currentInitialVariation = computed(() => {
    const act = this.currentActForVariation();
    const idx = this.currentVariationIndex();
    return (act && idx !== -1) ? act.variations?.[idx] ?? null : null;
  });

  public currentCharacterSelection = computed(() =>
    this.characterModalMode() === 'opening'
      ? this.seasonDetails().opening_characters
      : this.seasonDetails().special_guests
  );

  public currentCharacterLimit = computed(() =>
    this.characterModalMode() === 'opening' ? this.OPENING_CHARACTER_LIMIT : this.SPECIAL_GUEST_LIMIT
  );

  public currentCharacterTitle = computed(() =>
    this.characterModalMode() === 'opening'
      ? 'Select this season Opening characters'
      : 'Select this season Special guests'
  );

  public currentActOptions = computed(() =>
    (this.currentActForEnemy()?.options as any) || {}
  );

  // --- Filtered Acts ---
  public hasData = computed(() => {
    const d = this.seasonDetails();
    return d.elemental_type_limided.length > 0 ||
      d.opening_characters.length > 0 ||
      d.special_guests.length > 0 ||
      d.acts.some(a => a.enemy_selection.length > 0 || a.variations.length > 0);
  });

  public bossActs = computed(() =>
    this.seasonDetails().acts.filter(a => a.type === 'Boss_fight')
  );

  public arcanaActs = computed(() =>
    this.seasonDetails().acts.filter(a => a.type === 'Arcana_fight')
  );

  public variationActs = computed(() =>
    this.seasonDetails().acts.filter(a => a.type === 'Variation_fight')
  );

  public activeElements = computed(() =>
    new Set(this.seasonDetails().elemental_type_limided.map(e => e.name))
  );

  // Element helpers
  public elementTypes: ElementTypeName[] = ["pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"];

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

  public async onReset() {
    if (!confirm('Are you sure you want to reset all data?')) return;

    this.resetInProgress.set(true);

    try {
      await this.seasonService.resetSeasonDetails();
      const acts = await this.seasonService.getAllActs();

      this.seasonDetails.set({
        elemental_type_limided: [],
        opening_characters: [],
        special_guests: [],
        acts
      });
    } catch (e) {
      console.error(e);
      alert('Reset failed');
    } finally {
      this.resetInProgress.set(false);
    }
  }



  public onSavePage() {
    const sanitizedData = sanitizeChars(this.seasonDetails()) as Season_details;
    console.log(sanitizedData);

    this.seasonService.saveSeasonDetails(sanitizedData);
    alert('Saved!');
  }

  // --- Element Modal ---
  public openElementModal() {
    this.showElementModal.set(true);
  }

  public closeElementModal(): void {
    this.showElementModal.set(false);
  }

  public onSaveElements(elements: ElementType[]): void {
    this.seasonDetails.update(prev => ({ ...prev, elemental_type_limided: elements }));
    this.closeElementModal();
  }

  public openCharacterModal(mode: 'opening' | 'special'): void {
    this.characterModalMode.set(mode);
    this.showCharactersModal.set(true);
  }

  public closeCharacterModal(): void {
    this.showCharactersModal.set(false);
  }

  public onSaveCharacters(chars: Character[]): void {
    const mode = this.characterModalMode();
    this.seasonDetails.update(prev => ({
      ...prev,
      [mode === 'opening' ? 'opening_characters' : 'special_guests']: chars
    }));
    this.closeCharacterModal();
  }

  // --- Enemy Modal (Boss/Arcana) ---
  public openAddEnemyModal(act: Act): void {
    this.currentActForEnemy.set(act);
    this.currentVariationForEnemy.set(null);
    this.currentWaveForEnemy.set(null);

    // For Boss/Arcana, we automatically target variation[0].wave[0] for initialization
    if (act.type !== 'Variation_fight') {
      if (!act.variations?.length) {
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

  public closeAddEnemyModal(): void {
    this.showAddEnemyModal.set(false);
    this.currentActForEnemy.set(null);
    this.currentWaveForEnemy.set(null);
    this.currentVariationForEnemy.set(null);
  }

  // public onSaveEnemy(data: { enemy: Enemy, options: any }) {
  public onSaveEnemy(data: { enemies: Enemy[], options: Enemy_options }): void {
    const act = this.currentActForEnemy();
    if (!act) return;

    const processedEnemies = data.enemies.map(e => ({
      ...e,
      quantity: data.options.amount ? parseInt(data.options.amount) : 1,
      specialMark: !!data.options.special_type
    }));

    if (act.type === 'Variation_fight') {
      const wave = this.currentWaveForEnemy();
      if (wave) {
        wave.included_enemy = [...(wave.included_enemy || []), ...processedEnemies];
      }
    } else {
      if (!act.variations?.length) {
        act.variations = [{
          timer: data.options.timer || '',
          wave: '1',
          waves: [{ waveCount: 0, included_enemy: [] }]
        }];
      }

      const variation = act.variations[0];
      if (!variation.waves) variation.waves = [{ waveCount: 0, included_enemy: [] }];

      variation.waves[0].included_enemy = [...(variation.waves[0].included_enemy || []), ...processedEnemies];
      variation.timer = data.options.timer || '';
      act.enemy_selection = [...(act.enemy_selection || []), ...processedEnemies]; // Sync for legacy
      act.enemy_options = { ...data.options };
    }
    this.seasonDetails.set({ ...this.seasonDetails() });
    this.closeAddEnemyModal();
  }

  // --- Variation Modal ---
  public openVariationModal(act: Act, vIdx: number = -1): void {
    this.currentActForVariation.set(act);
    this.currentVariationIndex.set(vIdx);
    this.showVariationModal.set(true);
  }

  public closeVariationModal(): void {
    this.showVariationModal.set(false);
    this.currentActForVariation.set(null);
    this.currentVariationIndex.set(-1);
  }

  public onSaveVariation(data: { wave: Wave_type, timer: string, name?: string, monolit?: boolean }): void {

    const act = this.currentActForVariation();
    if (!act) return;

    if (!act.variations) act.variations = [];
    const vIdx = this.currentVariationIndex();

    if (vIdx !== -1) {
      const variation = act.variations[vIdx];
      variation.timer = data.timer;
      variation.wave = data.wave;
      variation.name = data.name;
      variation.monolit = data.monolit;

      const newWaveCount = data.wave === 'custom' ? 1 : parseInt(data.wave);
      if (variation.waves.length !== newWaveCount) {
        variation.waves = Array.from({ length: newWaveCount }, (_, i) => ({ waveCount: i, included_enemy: [] }));
      }
    } else {
      const waveCount = data.wave === 'custom' ? 1 : parseInt(data.wave);
      act.variations.push({
        timer: data.timer,
        wave: data.wave,
        waves: Array.from({ length: waveCount }, (_, i) => ({ waveCount: i, included_enemy: [] })),
        name: data.name,
        monolit: data.monolit
      });
    }

    this.seasonDetails.set({ ...this.seasonDetails() });
    this.closeVariationModal();
  }

  public openAddEnemyToWave(act: Act, variationIndex: number, waveIndex: number): void {
    const variation = act.variations?.[variationIndex];
    const wave = variation?.waves?.[waveIndex];
    if (!variation || !wave) return;

    this.currentActForEnemy.set(act);
    this.currentVariationForEnemy.set(variation);
    this.currentWaveForEnemy.set(wave);
    this.showAddEnemyModal.set(true);
  }

  // --- Helpers ---
  public getVariationName(act: Act): string {
    const s = act.variation_fight_settings;
    if (!s) return '';
    if (s.wave === 'custom') return s.name || 'Custom';
    return `Wave ${s.wave}`; // Or just "Wave 1 - 2 - 3"? Prompt says: "Wave" + variation_fight_settings.wave
  }

  private charactersMap = computed(() =>
    new Map(this.allCharacters().map(c => [c.id, c.avatarUrl]))
  );

  private enemiesMap = computed(() =>
    new Map(this.enemiesService.enemies().map(e => [e.id, e.avatarUrl]))
  );
  public resolveAvatarUrl(
    item: string | Character | Enemy | null | undefined
  ): string {
    if (!item) return 'assets/images/avatar_placeholder.png';

    const id = typeof item === 'string' ? item : item.id;

    return (
      this.charactersMap().get(id) ||
      this.enemiesMap().get(id) ||
      'assets/images/avatar_placeholder.png'
    );
  }


}
