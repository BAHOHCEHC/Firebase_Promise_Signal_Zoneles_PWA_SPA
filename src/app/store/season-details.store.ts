import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Act, Season_details } from '@models/models';
import { SeasonService } from '@shared/services/_index';

@Injectable({ providedIn: 'root' })
export class SeasonDetailsStore {
  private seasonService = inject(SeasonService);

  readonly seasonDetails = signal<Season_details | null>(null);

  readonly hasData = computed(() => !!this.seasonDetails());

  constructor() {
    this.loadFromLocalStorage();

    // Автозбереження при зміні
    effect(() => {
      this.saveToLocalStorage();
    });
  }

  // --- Дії ---

  setDetails(details: Season_details) {
    this.seasonDetails.set(details);
  }

  async loadDetailsIfNeeded() {
    if (this.seasonDetails()) {
      return;
    }
    await this.refreshDetails();
  }

  async refreshDetails() {
    const details = await this.seasonService.loadSeasonDetails();
    const allActs = await this.seasonService.getAllActs();

    let finalDetails: Season_details;

    if (details) {
      if (details.acts && details.acts.length > 0) {
        const mergedActs = allActs.map((dbAct) => {
          const savedAct = details.acts.find((a) => a.id === dbAct.id);
          if (savedAct) {
            return { ...dbAct, ...savedAct };
          }
          return dbAct;
        });
        finalDetails = { ...details, acts: mergedActs };
      } else {
        finalDetails = { ...details, acts: allActs };
      }
    } else {
      finalDetails = {
        elemental_type_limided: [],
        opening_characters: [],
        special_guests: [],
        acts: allActs
      };
    }

    this.seasonDetails.set(finalDetails);
  }

  // --- Збереження ---

  private saveToLocalStorage() {
    const data = this.seasonDetails();
    if (data) {
      localStorage.setItem('SeasonDetails', JSON.stringify(data));
    }
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('SeasonDetails');
      if (stored) {
        this.seasonDetails.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load SeasonDetails from LS', e);
    }
  }
}
