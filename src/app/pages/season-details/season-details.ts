import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Season_details, Character, Act, Wave, Variation, ElementTypeName, ElementType, Enemy, Enemy_options, Wave_type } from '../../../models/models';
import { sanitizeChars } from '../../../utils/sanitizeChars';
import { CharacterService } from '../../shared/services/charater.service';
import { EnemiesService } from '../../shared/services/enemies.service';
import { SeasonService } from '../../shared/services/season.service';
@Component({
  selector: 'app-seasons-details',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './season-details.html',
  styleUrl: './season-details.scss'
})
export class SeasonsDetails implements OnInit {
  private seasonService = inject(SeasonService);
  private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService); // Public to access signals in template if needed, or mapped

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

  public loading = signal(false);

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
  // --- Helpers ---
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
