import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Season_details, Character, Act, Wave, Variation, ElementTypeName, Enemy } from '@models/models';
import { CharacterService, EnemiesService, SeasonService } from '@shared/services/_index';
import { SeasonDetailsStore } from '@store/season-details.store'; // Або _index, якщо бажано
@Component({
  selector: 'app-seasons-details',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './season-details.html',
  styleUrl: './season-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonsDetails implements OnInit {
   private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService); // Public для доступу до сигналів у шаблоні, якщо потрібно, або відображено

  private seasonStore = inject(SeasonDetailsStore);

  // --- Сигнали стану ---
  public seasonDetails = computed<Season_details>(() => this.seasonStore.seasonDetails() || {
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: []
  });

  public allCharacters = signal<Character[]>([]);

  // --- Стан модальних вікон ---
  public showElementModal = signal(false);
  public showCharactersModal = signal(false);
  public showAddEnemyModal = signal(false);
  public showVariationModal = signal(false);
  public resetInProgress = signal(false);

  // --- Сигнали контексту модальних вікон ---
  public characterModalMode = signal<'opening' | 'special'>('opening');
  public currentActForEnemy = signal<Act | null>(null);
  public currentWaveForEnemy = signal<Wave | null>(null);
  public currentVariationForEnemy = signal<Variation | null>(null);
  public currentVariationIndex = signal<number>(-1);
  public currentActForVariation = signal<Act | null>(null);

  public loading = signal(true);

  // --- Обчислені вибори ---
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

  // --- Відфільтровані акти ---
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

  // Допоміжні елементи
  public elementTypes: ElementTypeName[] = ["pyro", "hydro", "electro", "cryo", "dendro", "anemo", "geo"];

  async ngOnInit() {
    this.loading.set(true);
    // Ініціалізація сервісів
    await this.enemiesService.initializeData();

    // Завантаження персонажів
    const chars = await this.characterService.getAllCharacters();
    this.allCharacters.set(chars);

    // Завантаження деталей сезону через сховище
    await this.seasonStore.loadDetailsIfNeeded();

    this.loading.set(false);
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`; // Припускаємо шлях
  }
  // --- Допоміжні методи ---
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
