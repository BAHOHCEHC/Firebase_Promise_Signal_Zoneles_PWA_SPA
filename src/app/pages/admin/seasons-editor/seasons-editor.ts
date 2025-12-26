import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Season_details, Character, Act, Wave, ElementTypeName, ElementType, Act_options, Enemy, Wave_type } from '../../../../models/models';
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
  public currentWaveForEnemy = signal<Wave | null>(null); // If adding to a specific wave in variation
  public currentVariationIndex = signal<number>(-1); // To track which variation we are editing
  public currentActForVariation = signal<Act | null>(null);

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
    return this.characterModalMode() === 'opening' ? 6 : 4;
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
    this.currentWaveForEnemy.set(null); // Not a variation wave
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

  public onSaveEnemy(data: { enemy: Enemy, options: any }) {
    const act = this.currentActForEnemy();
    if (!act) return;

    if (this.currentWaveForEnemy()) {
      // Adding to a variation wave
      // Logic for variation wave enemy add
      // We need to update the specific wave in the specific variation
      // This logic is complex because accessing the specific wave object by reference in deep structure
      // Better to track indices?
      // For now, simple push if we have reference.
      // But `currentWaveForEnemy` is a copy? No, objects are ref.
      // But we need to trigger signal update.
      const wave = this.currentWaveForEnemy()!;
      if (!wave.included_enemy) wave.included_enemy = [];

      // Update enemy with options (amount displayed as badge?)
      // "Amount appears as icon badge... on avatar"
      // We need to store options on the Enemy object in the list?
      // Enemy interface has `quantity`, `specialMark`.
      // We can update those.
      const enemyToAdd = {
        ...data.enemy,
        quantity: data.options.amount ? parseInt(data.options.amount) : 1, // Store as number if model says number
        specialMark: data.options.special_type || false
      };

      wave.included_enemy.push(enemyToAdd);

    } else {
      // Boss/Arcana: update act.enemy_selection and act.enemy_options
      // "In Act.enemy_selection are added those units we selected in modal"
      // "Data saves in collection acts(enemy_selection), acts.enemy_options"

      const enemyToAdd = {
        ...data.enemy,
        specialMark: data.options.special_type || false,
        quantity: data.options.amount ? parseInt(data.options.amount) : 1
      };

      // Logic: Can we have multiple enemies? Yes.
      act.enemy_selection = [...act.enemy_selection, enemyToAdd];

      // Act.enemy_options - seems to be global for the act? Or per enemy?
      // "Amount,Defeat,Timer(type string) affects acts.enemy_options"
      // If multiple enemies, does it overwrite?
      // Usually Boss acts have 1 boss.
      // If we add multiple, maybe we just merge options?
      // I will merge.
      act.enemy_options = { ...act.enemy_options, ...data.options };
    }

    // Trigger update
    this.seasonDetails.update(d => ({ ...d }));
    this.closeAddEnemyModal();
  }

  // --- Variation Modal ---
  public openVariationModal(act: Act) {
    this.currentActForVariation.set(act);
    this.showVariationModal.set(true);
  }

  public closeVariationModal() {
    this.showVariationModal.set(false);
    this.currentActForVariation.set(null);
  }

  public onSaveVariation(data: { wave: Wave_type, timer: string, name?: string, monolit?: boolean }) {
    const act = this.currentActForVariation();
    if (!act) return;

    // Update act.variation_fight_settings
    // "save - saves value in collection acts. variation_fight_settings, variations"
    // Wait, "buttons ... add setup wave act.variations: Wave[]"
    // "Variation Chambers ... button +Add variation calls ... modal"
    // It seems we configure the LAYOUT of the variation?
    // And also add a "variation" to the list?
    // "After settings made ... adds monsters via opening season-add-enemy-modal" - this is separate step "column section with button +"

    // Act has `variations: Wave[]`.
    // Also `variation_fight_settings`.
    // The modal sets `variation_fight_settings`.
    // Does it also create a wave?
    // "Button +Add variation ... save ... block changes view ... appears section ... with button +"
    // It seems `variation_fight_settings` is PER ACT.
    // But prompt says "Act 1 ... + Add variation".
    // If we add variation, do we imply multiple variations?
    // `acts` collection is `Act[]`.
    // `Act` has `variation_fight_settings` (singular).
    // `Act` has `variations: Wave[]` (plural).

    // Interpretation:
    // The "Add variation" button creates/configures the settings for the variation fight.
    // Once configured, it shows the waves.
    // Maybe `variations` is actually where we add waves?
    // "Add variation chamber ... field dropdown '1' | '2' | '3' | 'custom' Variation_fight.wave"
    // This implies we are setting up HOW MANY waves or WHAT TYPE of waves.
    // If I select "2", maybe I create 2 waves?
    // Or maybe "Wave" means "Wave 1", "Wave 2"?

    // "Button +Add variation" implies adding ONE variation?
    // But `Variation_fight` seems to be the SETTINGS for the fight.
    // I will assume for now:
    // 1. User clicks "+ Add variation" -> configures settings (timer, wave type, monolit).
    // 2. This Initializes `act.variation_fight_settings`.
    // 3. Based on `wave` type ("1", "2", "3"), we generate 1, 2, or 3 `Wave` objects in `act.variations`.
    // 4. Then user can add enemies to each wave provided by the "column section".

    if (!act.variations) act.variations = [];

    act.variation_fight_settings = {
      wave: data.wave,
      timer: data.timer,
      name: data.name,
      monolit: data.monolit
    };

    // Generate waves if empty?
    // If type is "1", ensure 1 wave. "2" -> 2 waves. "3" -> 3 waves.
    // "custom" -> 1 wave? or user adds them?
    // Prompt doesn't specify logic explicitly but says: "if simply 1-2-3 then 'Wave' + value... section with button +".

    const count = data.wave === 'custom' ? 1 : parseInt(data.wave);
    // Resize variations array
    if (act.variations.length < count) {
      for (let i = act.variations.length; i < count; i++) {
        act.variations.push({ included_enemy: [] });
      }
    } else if (act.variations.length > count) {
      // Should we shrink? Maybe warn? For now, slice.
      act.variations = act.variations.slice(0, count);
    } else {
      // Existing waves preserved (enemies kept)
    }

    this.seasonDetails.update(d => ({ ...d }));
    this.closeVariationModal();
  }

  public openAddEnemyToWave(act: Act, waveIndex: number) {
    if (!act.variations || !act.variations[waveIndex]) return;
    this.currentActForEnemy.set(act);
    this.currentWaveForEnemy.set(act.variations[waveIndex]);
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
