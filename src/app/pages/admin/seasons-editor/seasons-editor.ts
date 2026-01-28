import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Season_details,
  Character,
  Act,
  Variation,
  Wave,
  ElementTypeName,
  ElementType,
  Enemy,
  Wave_type,
  Enemy_options,
} from '@models/models';
import {
  SeasonAddEnemyModal,
  SeasonAddVariationChamberModal,
  SeasonCharactersModal,
  SeasonElementTypeModal,
} from '@core/components/_index';
import {
  CharacterService,
  EnemiesService,
  SeasonService,
  ActModsService,
} from '@shared/services/_index';
import { sanitizeChars } from '@utils/sanitizeChars';

@Component({
  selector: 'app-seasons-editor',
  standalone: true,
  imports: [
    CommonModule,
    SeasonAddEnemyModal,
    SeasonAddVariationChamberModal,
    SeasonCharactersModal,
    SeasonElementTypeModal,
  ],
  templateUrl: './seasons-editor.html',
  styleUrl: './seasons-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeasonsEditorComponent implements OnInit {
  private seasonService = inject(SeasonService);
  private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService);
  public modeService = inject(ActModsService);

  public readonly OPENING_CHARACTER_LIMIT = 6;
  public readonly SPECIAL_GUEST_LIMIT = 4;

  // --- Сигнали стану ---
  public seasonDetails = signal<Season_details>({
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: [],
  });

  public allCharacters = signal<Character[]>([]);
  public isEditMode = signal(false);
  public loading = signal(true);

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
    return act && idx !== -1 ? (act.variations?.[idx] ?? null) : null;
  });

  public currentCharacterSelection = computed(() =>
    this.characterModalMode() === 'opening'
      ? this.seasonDetails().opening_characters
      : this.seasonDetails().special_guests,
  );

  public currentCharacterLimit = computed(() =>
    this.characterModalMode() === 'opening'
      ? this.OPENING_CHARACTER_LIMIT
      : this.SPECIAL_GUEST_LIMIT,
  );

  public currentCharacterTitle = computed(() =>
    this.characterModalMode() === 'opening'
      ? 'Select this season Opening characters'
      : 'Select this season Special guests',
  );

  public currentActOptions = computed(() => (this.currentActForEnemy()?.options as any) || {});

  // --- Відфільтровані акти ---
  public hasData = computed(() => {
    const d = this.seasonDetails();
    return (
      d.elemental_type_limided.length > 0 ||
      d.opening_characters.length > 0 ||
      d.special_guests.length > 0 ||
      d.acts.some((a) => a.enemy_selection.length > 0 || a.variations.length > 0)
    );
  });

  public bossActs = computed(() =>
    this.seasonDetails().acts.filter((a) => a.type === 'Boss_fight'),
  );

  public arcanaActs = computed(() =>
    this.seasonDetails().acts.filter((a) => a.type === 'Arcana_fight'),
  );

  public variationActs = computed(() =>
    this.seasonDetails().acts.filter((a) => a.type === 'Variation_fight'),
  );

  public activeElements = computed(
    () => new Set(this.seasonDetails().elemental_type_limided.map((e) => e.name)),
  );

  // Допоміжні елементи
  public elementTypes: ElementTypeName[] = [
    'pyro',
    'hydro',
    'electro',
    'cryo',
    'dendro',
    'anemo',
    'geo',
  ];

  async ngOnInit() {
    this.loading.set(true);
    // Ініціалізація сервісів
    await this.enemiesService.initializeData();

    // Завантаження персонажів
    const chars = await this.characterService.getAllCharacters();
    this.allCharacters.set(chars);

    // Завантаження деталей сезону
    const details = await this.seasonService.loadSeasonDetails();
    if (details) {
      // Якщо завантажено, можливо, нам потрібно об'єднати з існуючими актами, якщо структура змінилася?
      // Але промпт каже "при ініціалізації завантажує дані з колекції season_details для додаткового налаштування актів, створених раніше".
      // Тому ми повинні перевірити, чи відповідають акти відомим актам?
      // Припускаємо, що акти season_details є джерелом істини для цього редактора.
      // Однак, якщо акти були додані в "act-and-modes-editor", нам, ймовірно, слід отримати ВСІ акти і перевірити, чи є вони в season_details.
      // Якщо season_details частковий, ми заповнюємо його.
      // Наразі, завантажимо те, що маємо.

      // Нам також потрібно отримати акти з колекції 'acts', щоб переконатися, що у нас є структура для всіх актів (наприклад, ім'я, тип)
      // тому що season_details може зберігати лише перевизначення? Або повні об'єкти?
      // План реалізації передбачав, що season_details зберігає повні об'єкти Act або пов'язані.
      // Я отримаю всі АКТИ, щоб бути впевненим, що у нас є структура для відображення.
      const allActs = await this.seasonService.getAllActs();

      // Логіка злиття: використовувати акти деталей сезону, якщо вони є, інакше використовувати allActs (але ініціалізовані порожніми для специфіки сезону)
      // Власне, якщо ми скидаємо, ми, ймовірно, повинні перезавантажити акти з колекції 'acts' з порожніми налаштуваннями сезону.

      if (details.acts && details.acts.length > 0) {
        // Переконатися, що у нас є всі акти з БД, можливо, з'явилися нові
        const mergedActs = allActs.map((dbAct) => {
          const savedAct = details.acts.find((a) => a.id === dbAct.id);
          if (savedAct) {
            return { ...dbAct, ...savedAct }; // Віддаємо перевагу збереженим деталям, але зберігаємо посилання
          }
          return dbAct;
        });
        this.seasonDetails.set({ ...details, acts: mergedActs });
      } else {
        this.seasonDetails.update((s) => ({ ...s, acts: allActs }));
      }
    } else {
      // Налаштування нового сезону
      const allActs = await this.seasonService.getAllActs();
      this.seasonDetails.update((s) => ({ ...s, acts: allActs }));
    }
    this.loading.set(false);
  }

  public getElementIconPath(type: ElementTypeName): string {
    return `assets/images/ElementType_${type}.png`; // Припускаємо шлях
  }

  // --- Дії ---

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
        acts,
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
    this.modeService.updateModesByEnemyOptions(sanitizedData);
  }

  // --- Модальне вікно елементів ---
  public openElementModal() {
    this.showElementModal.set(true);
  }

  public closeElementModal(): void {
    this.showElementModal.set(false);
  }

  public onSaveElements(elements: ElementType[]): void {
    this.seasonDetails.update((prev) => ({ ...prev, elemental_type_limided: elements }));
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
    this.seasonDetails.update((prev) => ({
      ...prev,
      [mode === 'opening' ? 'opening_characters' : 'special_guests']: chars,
    }));
    this.closeCharacterModal();
  }

  // --- Модальне вікно ворога (Бос/Аркана) ---
  public openAddEnemyModal(act: Act): void {
    this.currentActForEnemy.set(act);
    this.currentVariationForEnemy.set(null);
    this.currentWaveForEnemy.set(null);

    // Для Боса/Аркани, ми автоматично вибираємо variation[0].wave[0] для ініціалізації
    if (act.type !== 'Variation_fight') {
      if (!act.variations?.length) {
        act.variations = [
          {
            timer: act.enemy_options?.timer || '',
            wave: '1',
            waves: [{ waveCount: 0, included_enemy: [] }],
          },
        ];
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
  public onSaveEnemy(data: { enemies: Enemy[]; options: Enemy_options }): void {
    const act = this.currentActForEnemy();
    if (!act) return;

    const processedEnemies = data.enemies.map((e) => ({
      ...e,
      quantity: data.options.amount ? parseInt(data.options.amount) : undefined,
      specialMark: !!data.options.special_type,
    }));

    if (act.type === 'Variation_fight') {
      const wave = this.currentWaveForEnemy();
      if (wave) {
        wave.included_enemy = [...(wave.included_enemy || []), ...processedEnemies];
      }
    } else {
      if (!act.variations?.length) {
        act.variations = [
          {
            timer: data.options.timer || '',
            wave: '1',
            waves: [{ waveCount: 0, included_enemy: [] }],
          },
        ];
      }

      const variation = act.variations[0];
      if (!variation.waves) variation.waves = [{ waveCount: 0, included_enemy: [] }];

      variation.waves[0].included_enemy = [
        ...(variation.waves[0].included_enemy || []),
        ...processedEnemies,
      ];
      variation.timer = data.options.timer || '';
      variation.defeat = data.options.defeat || '';
      act.enemy_selection = [...(act.enemy_selection || []), ...processedEnemies]; // Синхронізація для сумісності
      act.enemy_options = { ...data.options };
    }
    this.seasonDetails.set({ ...this.seasonDetails() });
    this.closeAddEnemyModal();
  }

  // --- Модальне вікно варіацій ---
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

  public onSaveVariation(data: {
    wave: Wave_type;
    timer: string;
    name?: string;
    monolit?: boolean;
  }): void {
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
        variation.waves = Array.from({ length: newWaveCount }, (_, i) => ({
          waveCount: i,
          included_enemy: [],
        }));
      }
    } else {
      const waveCount = data.wave === 'custom' ? 1 : parseInt(data.wave);
      act.variations.push({
        timer: data.timer,
        wave: data.wave,
        waves: Array.from({ length: waveCount }, (_, i) => ({ waveCount: i, included_enemy: [] })),
        name: data.name,
        monolit: data.monolit,
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

  // --- Допоміжні методи ---
  public getVariationName(act: Act): string {
    const s = act.variation_fight_settings;
    if (!s) return '';
    if (s.wave === 'custom') return s.name || 'Custom';
    return `Wave ${s.wave}`; // Або просто "Wave 1 - 2 - 3"? Промпт каже: "Wave" + variation_fight_settings.wave
  }

  private charactersMap = computed(
    () => new Map(this.allCharacters().map((c) => [c.id, c.avatarUrl])),
  );

  private enemiesMap = computed(
    () => new Map(this.enemiesService.enemies().map((e) => [e.id, e.avatarUrl])),
  );
  public resolveAvatarUrl(item: string | Character | Enemy | null | undefined): string {
    if (!item) return 'assets/images/avatar_placeholder.png';

    const id = typeof item === 'string' ? item : item.id;

    return (
      this.charactersMap().get(id) ||
      this.enemiesMap().get(id) ||
      'assets/images/avatar_placeholder.png'
    );
  }
}
