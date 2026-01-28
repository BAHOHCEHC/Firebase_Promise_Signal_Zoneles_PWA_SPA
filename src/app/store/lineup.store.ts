import { computed, effect, Injectable, signal } from '@angular/core';
import { LineUpConfig, ModeConfiguration } from '@models/models';

@Injectable({ providedIn: 'root' })
export class LineupStore {
    /** Мапа ID режиму -> Конфігурація */
    readonly configurations = signal<LineUpConfig>({});

    /** ID активного режиму */
    readonly activeModeId = signal<string | null>(null);

    /** Активна конфігурація */
    readonly currentConfig = computed(() => {
        const modeId = this.activeModeId();
        const configs = this.configurations();
        if (!modeId) return null;
        return configs[modeId] || this.createEmptyConfig();
    });

    /** Вибрані персонажі в активному режимі */
    readonly selectedCharacterIds = computed(() => {
        return this.currentConfig()?.selectedCharacters || [];
    });

    /** Розміщення в активному режимі (ActID -> CharIDs[]) */
    readonly placements = computed(() => {
        return this.currentConfig()?.placements || {};
    });

    /** Енергія в активному режимі (CharID -> Energy) */
    readonly energyState = computed(() => {
        return this.currentConfig()?.energyState || {};
    });

    /** Вибрані вороги в активному режимі (ActID -> Index) */
    readonly selectedEnemyIndices = computed(() => {
        return this.currentConfig()?.selectedEnemies || {};
    });

    constructor() {
        this.loadFromLocalStorage();

        // Автозбереження при зміні
        effect(() => {
            this.saveToLocalStorage();
        });
    }

    private createEmptyConfig(): ModeConfiguration {
        return {
            selectedCharacters: [],
            placements: {},
            energyState: {},
            selectedEnemies: {}
        };
    }

    // --- Дії ---

    setActiveMode(modeId: string) {
        this.activeModeId.set(modeId);
        // Ініціалізація конфігурації, якщо відсутня
        this.configurations.update(current => {
            if (!current[modeId]) {
                return {
                    ...current,
                    [modeId]: this.createEmptyConfig()
                };
            }
            return current;
        });
    }

    /** Оновити вибраних персонажів для поточного режиму */
    updateSelectedCharacters(charIds: string[]) {
        const modeId = this.activeModeId();
        if (!modeId) return;

        this.configurations.update(configs => {
            const modeConfig = configs[modeId] || this.createEmptyConfig();
            // Зберігати енергію лише для персонажів, які залишаються вибраними, або є стандартними?
            // Наразі простіше: просто оновити список.
            return {
                ...configs,
                [modeId]: {
                    ...modeConfig,
                    selectedCharacters: charIds
                }
            };
        });
    }

    /**
     * Реєстрація розміщення персонажа в акті
     * @param actId ID акту
     * @param charId ID персонажа
     * @param maxEnergy Максимальна енергія для цього персонажа (зазвичай 2)
     */
    placeCharacter(actId: string, charId: string, maxEnergy: number = 2) {
        const modeId = this.activeModeId();
        if (!modeId) return;

        this.configurations.update(configs => {
            const config = configs[modeId] || this.createEmptyConfig();
            const currentPlacements = { ...config.placements };
            const currentEnergy = { ...config.energyState };

            // 1. Перевірити, чи вже є в цьому акті (запобігти подвійному розміщенню, якщо потрібно, хоча логіка перетягування це обробляє)
            const actList = currentPlacements[actId] || [];
            if (actList.includes(charId)) return configs; // Already here

            // 2. Споживати енергію
            const usedEnergy = currentEnergy[charId] || 0;
            if (usedEnergy >= maxEnergy) return configs; // No energy

            // 3. Оновити
            currentPlacements[actId] = [...actList, charId];
            currentEnergy[charId] = usedEnergy + 1;

            return {
                ...configs,
                [modeId]: {
                    ...config,
                    placements: currentPlacements,
                    energyState: currentEnergy
                }
            };
        });
    }

    /**
     * Видалити персонажа з акту
     */
    removeCharacter(actId: string, charId: string) {
        const modeId = this.activeModeId();
        if (!modeId) return;

        this.configurations.update(configs => {
            const config = configs[modeId];
            if (!config) return configs;

            const currentPlacements = { ...config.placements };
            const currentEnergy = { ...config.energyState };

            // 1. Видалити з акту
            const actList = currentPlacements[actId] || [];
            if (!actList.includes(charId)) return configs;

            currentPlacements[actId] = actList.filter(id => id !== charId);

            // 2. Відновити енергію
            const usedEnergy = currentEnergy[charId] || 0;
            if (usedEnergy > 0) {
                currentEnergy[charId] = usedEnergy - 1;
            }

            return {
                ...configs,
                [modeId]: {
                    ...config,
                    placements: currentPlacements,
                    energyState: currentEnergy
                }
            };
        });
    }

    /**
     * Отримати поточну енергію для конкретного персонажа (0, якщо не задано)
     */
    getCharacterEnergy(charId: string): number {
        return this.energyState()[charId] || 0;
    }

    /**
     * Вибрати ворога для конкретного акту
     */
    selectEnemy(actId: string, enemyIndex: number) {
        const modeId = this.activeModeId();
        if (!modeId) return;

        this.configurations.update(configs => {
            const config = configs[modeId] || this.createEmptyConfig();
            const currentSelectedEnemies = { ...config.selectedEnemies };

            currentSelectedEnemies[actId] = enemyIndex;

            return {
                ...configs,
                [modeId]: {
                    ...config,
                    selectedEnemies: currentSelectedEnemies
                }
            };
        });
    }

    // --- Збереження даних ---

    private saveToLocalStorage() {
        const data = this.configurations();
        localStorage.setItem('LineUpConfig', JSON.stringify(data));
    }

    private loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('LineUpConfig');
            if (stored) {
                this.configurations.set(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load LineUpConfig', e);
        }
    }
}
