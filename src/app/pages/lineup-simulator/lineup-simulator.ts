import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CharacterService } from '../../shared/services/charater.service';
import { EnemiesService } from '../../shared/services/enemies.service';
import { SeasonService } from '../../shared/services/season.service';
import { Character, ElementTypeName, Enemy, Mode, Season_details } from '../../../models/models';
import { ActModsService } from '../../shared/services/act-mods.service';
import { characterStore } from '../../store/character.store';
import { LineupStore } from '../../store/lineup.store';
import { sortCharacters } from '../../../utils/sorting-characters';
import { SeasonCharactersModal } from '../../core/components/season-characters-modal/season-characters-modal';

@Component({
  selector: 'app-lineup-simulator',
  imports: [SeasonCharactersModal],
  standalone: true,
  templateUrl: './lineup-simulator.html',
  styleUrl: './lineup-simulator.scss',
})
export class LineupSimulator implements OnInit {
  @ViewChild(SeasonCharactersModal) seasonCharactersModal!: SeasonCharactersModal;

  private seasonService = inject(SeasonService);
  private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService);
  private actModsService = inject(ActModsService);

  public store = inject(LineupStore);

  public loading = signal(true);

  public allCharacters = computed(() => characterStore.selectedCharacters());

  // Filtered characters for the modal (only show allowed elements)
  public availableCharacters = computed(() => {
    const usersSelectedChars = this.allCharacters();
    const allowed = this.activeElements();
    if (allowed.size === 0) return usersSelectedChars;
    return usersSelectedChars.filter((c) => c.element && allowed.has(c.element.name));
  });

  // Users characters for the ACTIVE mode
  readonly usersCharacter = computed(() => {
    const selectedIds = new Set(this.store.selectedCharacterIds());
    if (selectedIds.size === 0) return [];

    // Efficient lookup
    const all = this.allCharacters();
    if (all.length === 0) return [];

    const energyState = this.store.energyState();

    const chars = all
      .filter((c) => selectedIds.has(c.id))
      .map((c) => {
        const consumed = energyState[c.id] || 0;
        return { ...c, energy: Math.max(0, 2 - consumed) };
      });
    return sortCharacters(chars);
  });

  // Opening characters with energy state
  readonly openingCharacters = computed(() => {
    const opening = this.seasonDetails().opening_characters || [];
    if (opening.length === 0) return [];

    const energyState = this.store.energyState();

    return opening.map((c) => {
      const consumed = energyState[c.id] || 0;
      return { ...c, energy: Math.max(0, 2 - consumed) };
    });
  });

  public modes = signal<Mode[]>([]);
  public enemies = signal<Enemy[]>([]);
  public activeMode = computed(() => {
    const id = this.store.activeModeId();
    return this.modes().find((m) => m.id === id) || null;
  });

  // --- State Signals ---
  public seasonDetails = signal<Season_details>({
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: [],
  });

  // Element helpers
  public elementTypes: ElementTypeName[] = [
    'pyro',
    'hydro',
    'electro',
    'cryo',
    'dendro',
    'anemo',
    'geo',
  ];

  public activeElements = computed(
    () => new Set(this.seasonDetails().elemental_type_limided.map((e) => e.name)),
  );

  // Split acts for 2-column layout (Act 1-5 Left, Act 6-10 Right) + Arcana
  public leftActs = computed(() => {
    const acts = this.activeMode()?.chambers || [];
    return acts
      .filter((a) => a.type !== 'Arcana_fight' && a.name <= 5)
      .sort((a, b) => a.name - b.name);
  });

  public rightActs = computed(() => {
    const acts = this.activeMode()?.chambers || [];
    return acts
      .filter((a) => a.type !== 'Arcana_fight' && a.name > 5)
      .sort((a, b) => a.name - b.name);
  });

  public arcanaActs = computed(() => {
    const acts = this.activeMode()?.chambers || [];
    return acts.filter((a) => a.type === 'Arcana_fight').sort((a, b) => a.name - b.name);
  });

  async ngOnInit() {
    this.loading.set(true);
    // Init services

    // Load chars - Optimization: use store if available
    if (characterStore.allCharacters().length === 0) {
      const chars = await this.characterService.getAllCharacters();
      characterStore.setCharacters(chars);
    }
    // Load modes
    const modes = await this.actModsService.getAllModes();
    this.modes.set(modes);

    // Initial Active Mode
    if (modes.length > 0 && !this.store.activeModeId()) {
      this.store.setActiveMode(modes[0].id);
    } else if (modes.length > 0 && this.store.activeModeId()) {
      // Ensure active mode is valid
      const exists = modes.some((m) => m.id === this.store.activeModeId());
      if (!exists) this.store.setActiveMode(modes[0].id);
      else this.store.setActiveMode(this.store.activeModeId()!);
    }

    // Load Season Details
    const details = await this.seasonService.loadSeasonDetails();
    // Fetch generic Acts structure to ensure we have all acts (e.g. name, type)
    const allActs = await this.seasonService.getAllActs();
    if (details) {
      if (details.acts && details.acts.length > 0) {
        // Merge saved details with fresh Act definitions
        const mergedActs = allActs.map((dbAct) => {
          const savedAct = details.acts.find((a) => a.id === dbAct.id);
          if (savedAct) {
            return { ...dbAct, ...savedAct };
          }
          return dbAct;
        });
        this.seasonDetails.set({ ...details, acts: mergedActs });
      } else {
        // Details exist but no acts saved, use allActs
        this.seasonDetails.update((s) => ({ ...details, acts: allActs }));
      }
    } else {
      // New season setup
      this.seasonDetails.update((s) => ({ ...s, acts: allActs }));
    }

    // Load enemies for lookups
    await this.enemiesService.loadEnemies();

    this.loading.set(false);
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`;
  }

  onModeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const modeId = select.value;
    this.store.setActiveMode(modeId);
  }

  public getActEnemies(act: any): Enemy[] {
    // using any for Act temporarily if import needed or use Act type
    if (!act) return [];

    // Logic: if Variation_fight -> show first monster from variations -> waves -> included_enemy
    // If it's Variation_fight, we look at variations.
    if (act.type === 'Variation_fight') {
      const enemies: Enemy[] = [];
      if (act.variations) {
        for (const v of act.variations) {
          if (v.waves && v.waves.length > 0) {
            const w = v.waves[0];
            if (w.included_enemy && w.included_enemy.length > 0) {
              enemies.push(w.included_enemy[0]);
            }
          }
        }
      }
      return enemies;
    } else {
      // For others, use enemy_selection?
      if (act.enemy_selection && act.enemy_selection.length > 0) {
        return act.enemy_selection;
      }
      return [];
    }
  }
  
  public isEnemyActive(actId: string, index: number): boolean {
    const selectedIndices = this.store.selectedEnemyIndices();
    // Default to index 0 if not set
    const selectedIndex = selectedIndices[actId] ?? 0;
    return selectedIndex === index;
  }

  public onSelectEnemy(actId: string, index: number) {
    this.store.selectEnemy(actId, index);
  }

  public getPlacedCharacters(actId: string): Character[] {
    const placements = this.store.placements();
    const charIds = placements[actId] || [];
    if (charIds.length === 0) return [];

    // Resolve chars from GLOBAL store to ensure we find Opening characters (who aren't in 'selected')
    const all = characterStore.allCharacters();
    return charIds.map((id) => all.find((c) => c.id === id)).filter((c) => !!c) as Character[];
  }

  // --- Modal Logic ---
  isModalOpen = signal(false);

  openAlternateCastModal() {
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSaveAlternateCast(selectedChars: Character[]) {
    this.store.updateSelectedCharacters(selectedChars.map((c) => c.id));
    this.closeModal();
  }

  // --- Drag & Drop ---

  onDragStart(event: DragEvent, char: Character) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', char.id);
      event.dataTransfer.effectAllowed = 'copy';

      // Set custom drag image using the card element itself
      // event.currentTarget is the div.char-mini-card which contains the img and background
      const dragElement = event.currentTarget as HTMLElement;
      event.dataTransfer.setDragImage(dragElement, 35, 35); // Center cursor roughly (70x70 card)
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Allow drop
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent, actId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      const charId = event.dataTransfer.getData('text/plain');
      if (charId) {
        this.store.placeCharacter(actId, charId);
      }
    }
  }

  onRemoveCharacter(actId: string, charId: string) {
    this.store.removeCharacter(actId, charId);
  }

  saveConfiguration() {
    this.loading.set(true);
    // Auto-save logic handles persistence, but we can manually triggering it if needed
    // or just simulate a save delay for feedback.
    // The store effect auto-saves.
    setTimeout(() => {
      this.loading.set(false);
    }, 500);
  }

  public resolveAvatarUrl(item: string | Character | Enemy | null | undefined): string {
    if (!item) return 'assets/images/avatar_placeholder.png';

    // Priority: 1. Direct URL on object, 2. Map lookup by ID
    if (typeof item !== 'string' && item.avatarUrl) {
      return item.avatarUrl;
    }

    const id = typeof item === 'string' ? item : item.id;

    return (
      this.charactersMap().get(id) ||
      this.enemiesMap().get(id) ||
      'assets/images/avatar_placeholder.png'
    );
  }
  // --- Helpers ---
  private charactersMap = computed(
    () => new Map(characterStore.allCharacters().map((c) => [c.id, c.avatarUrl])),
  );

  private enemiesMap = computed(
    () => new Map(this.enemiesService.enemies().map((e) => [e.id, e.avatarUrl])),
  );
}
