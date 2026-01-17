import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Season_details, Character, Act, Wave, Variation, ElementTypeName, Enemy } from '@models/models';
import { CharacterService, EnemiesService, SeasonService } from '@shared/services/_index';
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

  public loading = signal(true);

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
    this.loading.set(true);
    // Init services
    await this.enemiesService.initializeData();

    // Load chars
    const chars = await this.characterService.getAllCharacters();
    this.allCharacters.set(chars);

    // Load Season Details
    const details = await this.seasonService.loadSeasonDetails();
    // Fetch generic Acts structure to ensure we have all acts (e.g. name, type)
    const allActs = await this.seasonService.getAllActs();

    if (details) {
      if (details.acts && details.acts.length > 0) {
        // Merge saved details with fresh Act definitions
        const mergedActs = allActs.map(dbAct => {
          const savedAct = details.acts.find(a => a.id === dbAct.id);
          if (savedAct) {
            return { ...dbAct, ...savedAct };
          }
          return dbAct;
        });
        this.seasonDetails.set({ ...details, acts: mergedActs });
      } else {
        // Details exist but no acts saved, use allActs
        this.seasonDetails.update(s => ({ ...details, acts: allActs }));
      }
    } else {
      // New season setup
      this.seasonDetails.update(s => ({ ...s, acts: allActs }));
    }

    this.loading.set(false);
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
