import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  setDoc,
  getDoc
} from '@angular/fire/firestore';
import { Act, Season_details } from '../../../models/models';

@Injectable({
  providedIn: 'root',
})
export class SeasonService {
  private firestore = inject(Firestore);
  private seasonCollection = collection(this.firestore, 'season_details');
  private actsCollection = collection(this.firestore, 'acts');

  seasonDetails = signal<Season_details | null>(null);

  constructor() { }

  async loadSeasonDetails(): Promise<Season_details | null> {
    const querySnapshot = await getDocs(this.seasonCollection);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data() as Season_details;
      this.seasonDetails.set(data);
      return data;
    }
    return null;
  }

  async saveSeasonDetails(details: Season_details): Promise<void> {
    // Firestore-safe копія без undefined
    const payload = firestoreSafe(details);

    // 1. Отримуємо існуючі season_details
    const querySnapshot = await getDocs(this.seasonCollection);

    // 2. Перезапис або створення
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await setDoc(docRef, payload, { merge: false }); // 🔥 повний overwrite
    } else {
      await addDoc(this.seasonCollection, payload);
    }

    // 3. Оновлюємо локальний state
    this.seasonDetails.set(payload);

    // 4. Синхронізація acts (окрема колекція)
    const batch = writeBatch(this.firestore);

    payload.acts.forEach(act => {
      if (!act.id) return;

      const actRef = doc(this.firestore, 'acts', act.id);

      batch.update(actRef, firestoreSafe({
        enemy_selection: act.enemy_selection ?? [],
        enemy_options: act.enemy_options ?? {},
        variations: act.variations ?? [],
        variation_fight_settings: act.variation_fight_settings ?? null
      }));
    });

    try {
      await batch.commit();
    } catch (e) {
      console.error('Error updating acts batch:', e);
      // season_details вже збережений — це другорядна синхронізація
    }
  }


  async resetSeasonDetails(): Promise<void> {
    const querySnapshot = await getDocs(this.seasonCollection);
    const batch = writeBatch(this.firestore);

    querySnapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
    this.seasonDetails.set(null);
  }

  // Method to get all acts from the 'acts' collection to populate the editor initially if season_details is empty
  async getAllActs(): Promise<Act[]> {
    const q = query(this.actsCollection, orderBy('name')); // Assuming 'name' or some order
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Act));
  }
}


function firestoreSafe<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
