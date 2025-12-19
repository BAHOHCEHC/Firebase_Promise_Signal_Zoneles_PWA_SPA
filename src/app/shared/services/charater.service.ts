import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, deleteDoc, doc, updateDoc, getDocs } from '@angular/fire/firestore';
import { Character } from '../../../models/models';

@Injectable({ providedIn: 'root' })
export class CharacterService {
  private firestore = inject(Firestore);
  private collectionRef = collection(this.firestore, 'characters');

  // /** Створити персонажа */
  // create(character: Omit<Character, 'id'>): Promise<void> {
  //   return addDoc(this.collectionRef, character).then(() => { });
  // }
  /** Створити персонажа і повернути його з реальним Firestore ID */
  async create(character: Omit<Character, 'id'>): Promise<Character> {
    const docRef = await addDoc(this.collectionRef, character);
    // Повертаємо повний об’єкт з ID документа
    return { ...character, id: String(docRef.id) }; // або String(docRef.id), якщо хочеш строковий ID
  }

  /** Оновити персонажа */
  update(character: Character): Promise<void> {
    if (!character.id) throw new Error('ID required for update');
    const ref = doc(this.firestore, 'characters', String(character.id));
    return updateDoc(ref, { ...character });
  }

  /** Видалити персонажа */
  delete(id: string): Promise<void> {
    const ref = doc(this.firestore, 'characters', String(id));
    return deleteDoc(ref);
  }

  /** Отримати ВСІХ персонажів */
  async getAllCharacters(): Promise<Character[]> {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs.map(doc => {
      const data = doc.data() as Omit<Character, 'id'>;
      return { id: String(doc.id), ...data };
    });
  }
}
