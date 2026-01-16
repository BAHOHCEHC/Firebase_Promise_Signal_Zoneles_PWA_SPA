import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CharacterService } from '../../shared/services/charater.service';
import { EnemiesService } from '../../shared/services/enemies.service';
import { SeasonService } from '../../shared/services/season.service';
import { Character, ElementTypeName, Enemy, Mode, Season_details } from '../../../models/models';
import { ActModsService } from '../../shared/services/act-mods.service';
import { characterStore } from '../../store/character.store';
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

  private seasonService = inject(SeasonService);
  private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService);
  private actModsService = inject(ActModsService);

  public loading = signal(true);

  public allCharacters = signal<Character[]>([]);

  readonly usersCharacter = computed(() => {
    const chars = sortCharacters(characterStore.selectedCharacters());
    return chars
  });

  public modes = signal<Mode[]>([]);
  public enemies = signal<Enemy[]>([]);
  public activeMode = signal<Mode | null>(null);
  // --- State Signals ---
  public seasonDetails = signal<Season_details>({
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: []
  });

  // Element helpers
  public elementTypes: ElementTypeName[] = ["pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"];

  public activeElements = computed(() =>
    new Set(this.seasonDetails().elemental_type_limided.map(e => e.name))
  );



  async ngOnInit() {
    this.loading.set(true);
    // Init services

    // Load enemy

    // Load chars
    const chars = await this.characterService.getAllCharacters();
    this.allCharacters.set(chars);
    // Load modes
    const modes = await this.actModsService.getAllModes();
    this.modes.set(modes);

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

  onModeChange(mode: Event) {
    console.log(mode);
  }

  // --- Helpers ---
  private charactersMap = computed(() =>
    new Map(this.allCharacters().map(c => [c.id, c.avatarUrl]))
  );

  private enemiesMap = computed(() =>
    new Map(this.enemiesService.enemies().map(e => [e.id, e.avatarUrl]))
  );
}
