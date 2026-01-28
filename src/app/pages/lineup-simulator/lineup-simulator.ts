import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import { ElementRef } from '@angular/core';
import {
  CharacterService,
  EnemiesService,
  SeasonService,
  ActModsService,
} from '@shared/services/_index';
import { Character, ElementTypeName, Enemy, Mode, Season_details } from '@models/models';
import { CharacterStore, LineupStore } from '@store/_index';
import { sortCharacters } from '@utils/sorting-characters';
import { SeasonCharactersModal } from '@core/components/_index';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-lineup-simulator',
  imports: [SeasonCharactersModal, ReactiveFormsModule],
  standalone: true,
  templateUrl: './lineup-simulator.html',
  styleUrl: './lineup-simulator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineupSimulator implements OnInit {
  @ViewChild(SeasonCharactersModal) seasonCharactersModal!: SeasonCharactersModal;

  private seasonService = inject(SeasonService);
  private characterService = inject(CharacterService);
  public enemiesService = inject(EnemiesService);
  private actModsService = inject(ActModsService);

  @ViewChild('screenshotRoot', { static: false })
  screenshotRoot!: ElementRef<HTMLElement>;

  public readonly store = inject(LineupStore);
  public readonly characterStore = inject(CharacterStore);

  public loading = signal(true);

  public allCharacters = computed(() => this.characterStore.selectedCharacters());

  // Відфільтровані персонажі для модального вікна (показувати тільки дозволені елементи)
  public availableCharacters = computed(() => {
    const usersSelectedChars = this.allCharacters();
    const openingIds = new Set(this.openingCharacters().map((c) => c.id));
    const allowed = this.activeElements();

    const filtered = usersSelectedChars.filter((c) => !openingIds.has(c.id));

    if (allowed.size === 0) return filtered;
    return filtered.filter((c) => c.element && allowed.has(c.element.name));
  });

  // Персонажі користувача для АКТИВНОГО режиму
  readonly usersCharacter = computed(() => {
    const selectedIds = new Set(this.store.selectedCharacterIds());
    if (selectedIds.size === 0) return [];

    // Ефективний пошук
    const charMap = new Map<string, Character>();
    [...this.allCharacters(), ...this.specialGuestCharacters()].forEach((c) =>
      charMap.set(c.id, c),
    );
    const all = Array.from(charMap.values());

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

  // Відкриваючі персонажі зі станом енергії
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

  // --- Сигнали стану ---
  public seasonDetails = signal<Season_details>({
    elemental_type_limided: [],
    opening_characters: [],
    special_guests: [],
    acts: [],
  });

  public specialGuestCharacters = computed(() => {
    const guests = this.seasonDetails().special_guests || [];
    const ownedIds = new Set(this.allCharacters().map((c) => c.id));
    return guests.filter((c) => ownedIds.has(c.id));
  });

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

  public activeElements = computed(
    () => new Set(this.seasonDetails().elemental_type_limided.map((e) => e.name)),
  );

  // Розділення актів для макету з 2 стовпців (Акт 1-5 зліва, Акт 6-10 справа) + Arcana
  public nonArcanaActs = computed(() => {
    const acts = this.activeMode()?.chambers || [];
    return acts
      .filter((a) => a.type !== 'Arcana_fight')
      .sort((a, b) => a.name - b.name);
  });

  public leftActs = computed(() => {
    const all = this.nonArcanaActs();
    const mid = Math.ceil(all.length / 2);
    return all.slice(0, mid);
  });

  public rightActs = computed(() => {
    const all = this.nonArcanaActs();
    const mid = Math.ceil(all.length / 2);
    return all.slice(mid);
  });

  public arcanaActs = computed(() => {
    const acts = this.activeMode()?.chambers || [];
    return acts.filter((a) => a.type === 'Arcana_fight').sort((a, b) => a.name - b.name);
  });

  async ngOnInit() {
    this.loading.set(true);
    // Ініціалізація сервісів

    // Завантаження персонажів - Оптимізація: використовувати магазин, якщо доступно
    if (this.characterStore.allCharacters().length === 0) {
      const chars = await this.characterService.getAllCharacters();
      this.characterStore.setCharacters(chars);
    }
    // Завантаження режимів
    const modes = await this.actModsService.getAllModes();
    this.modes.set(modes);

    // Початковий активний режим
    if (modes.length > 0 && !this.store.activeModeId()) {
      this.store.setActiveMode(modes[0].id);
    } else if (modes.length > 0 && this.store.activeModeId()) {
      // Переконатися, що активний режим дійсний
      const exists = modes.some((m) => m.id === this.store.activeModeId());
      if (!exists) this.store.setActiveMode(modes[0].id);
      else this.store.setActiveMode(this.store.activeModeId()!);
    }

    // Завантаження деталей сезону
    const details = await this.seasonService.loadSeasonDetails();
    // Отримання загальної структури актів, щоб переконатися, що ми маємо всі акти (наприклад, ім'я, тип)
    const allActs = await this.seasonService.getAllActs();
    if (details) {
      if (details.acts && details.acts.length > 0) {
        // Об'єднання збережених деталей зі свіжими визначеннями актів
        const mergedActs = allActs.map((dbAct) => {
          const savedAct = details.acts.find((a) => a.id === dbAct.id);
          if (savedAct) {
            return { ...dbAct, ...savedAct };
          }
          return dbAct;
        });
        this.seasonDetails.set({ ...details, acts: mergedActs });
      } else {
        // Деталі існують, але акти не збережені, використовуємо allActs
        this.seasonDetails.update((s) => ({ ...details, acts: allActs }));
      }
    } else {
      // Налаштування нового сезону
      this.seasonDetails.update((s) => ({ ...s, acts: allActs }));
    }

    // Завантаження ворогів для пошуку
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
    // тимчасово використовуємо any для Act, якщо потрібен імпорт або використовуйте тип Act
    if (!act) return [];

    // Логіка: якщо Variation_fight -> показати першого монстра з variations -> waves -> included_enemy
    // Якщо це Variation_fight, ми дивимось на variations.
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
      // Для інших, використовувати enemy_selection?
      if (act.enemy_selection && act.enemy_selection.length > 0) {
        return act.enemy_selection;
      }
      return [];
    }
  }

  public isEnemyActive(actId: string, index: number): boolean {
    const selectedIndices = this.store.selectedEnemyIndices();
    // За замовчуванням індекс 0, якщо не встановлено
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

    // Вирішити персонажів з ГЛОБАЛЬНОГО магазину, щоб переконатися, що ми знаходимо відкриваючих персонажів (яких немає в 'selected')
    const all = this.characterStore.allCharacters();
    return charIds.map((id) => all.find((c) => c.id === id)).filter((c) => !!c) as Character[];
  }

  // --- Логіка модального вікна ---
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

      // Встановити власне зображення перетягування, використовуючи сам елемент картки
      // event.currentTarget - це div.char-mini-card, який містить img і фон
      // Центрувати курсор приблизно (картка 70x70)
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Дозволити скидання
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

  async saveConfiguration() {
    try {
      // Даємо Angular домалювати DOM
      await new Promise((r) => setTimeout(r, 50));

      const element = this.screenshotRoot.nativeElement;

      const canvas = await html2canvas(element, {
        backgroundColor: '#0b0e14', // або null для прозорого
        scale: window.devicePixelRatio || 2, // якість
        useCORS: true, // важливо для картинок
        logging: false,
      });

      const image = canvas.toDataURL('image/png');
      const modeName = this.activeMode()?.name || 'Unknown';

      this.downloadImage(image, `lineup-config[${modeName}].png`);
    } catch (err) {
      console.error('Screenshot failed', err);
    }
  }

  private downloadImage(dataUrl: string, fileName: string) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  }

  public resolveAvatarUrl(item: string | Character | Enemy | null | undefined): string {
    if (!item) return 'assets/images/avatar_placeholder.png';

    // Пріоритет: 1. Пряма URL на об'єкті, 2. Пошук у карті за ID
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
  // --- Допоміжні методи ---
  private readonly charactersMap = computed(
    () => new Map(this.characterStore.allCharacters().map((c) => [c.id, c.avatarUrl])),
  );

  private enemiesMap = computed(
    () => new Map(this.enemiesService.enemies().map((e) => [e.id, e.avatarUrl])),
  );
}
