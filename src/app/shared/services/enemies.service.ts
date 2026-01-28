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
  writeBatch
} from '@angular/fire/firestore';
import {
  Enemy,
  EnemyCategory,
  EnemyGroup,
  ElementTypeName
} from '../../../models/models';

@Injectable({
  providedIn: 'root',
})
export class EnemiesService {
  private firestore = inject(Firestore);

  // Сигнали стану
  private _categories = signal<EnemyCategory[]>([]);
  private _enemies = signal<Enemy[]>([]);

  // Публічні сигнали тільки для читання
  public categories = this._categories.asReadonly();
  public enemies = this._enemies.asReadonly();

  // Допоміжні методи для конвертації документів Firestore
  private convertToCategory(doc: any): EnemyCategory {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || '',
      // createdAt: data.createdAt?.toDate() || new Date(),
      // updatedAt: data.updatedAt?.toDate() || new Date(),
      groups: [] // Групи будуть завантажені окремо
    };
  }

  private convertToGroup(doc: any): EnemyGroup {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || '',
      categoryId: data.categoryId || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  private convertToEnemy(doc: any): Enemy {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      element: {
        name: data.elementName || 'empty' as ElementTypeName,
        iconUrl: data.elementIconUrl || `assets/images/ElementType_empty.png`
      },
      avatarUrl: data.avatarUrl || '',
      specialMark: data.specialMark || false,
      quantity: data.quantity || 1,
      categoryId: data.categoryId || '',
      groupId: data.groupId || '', // Важливо: це string
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  // ========== ЗАВАНТАЖЕННЯ ВСІХ ДАНИХ ==========
  async loadAllData(): Promise<void> {
    try {
      await Promise.all([
        this.loadCategories(),
        this.loadGroups(),
        this.loadEnemies()
      ]);
    } catch (error) {
      console.error('Error loading all data:', error);
      throw error;
    }
  }

  // ========== КАТЕГОРІЇ ==========
  async loadCategories(): Promise<void> {
    try {
      const categoriesRef = collection(this.firestore, 'categories');
      const q = query(categoriesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const categories = querySnapshot.docs.map(doc =>
        this.convertToCategory(doc)
      ).reverse();

      this._categories.set(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      throw error;
    }
  }

  async addCategory(title: string): Promise<string> {
    try {
      const categoriesRef = collection(this.firestore, 'categories');
      const newCategory = {
        title,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(categoriesRef, newCategory);

      await this.loadCategories();

      return docRef.id;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(categoryId: string, updates: Partial<EnemyCategory>): Promise<void> {
    try {
      const categoryRef = doc(this.firestore, 'categories', categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: new Date()
      });

      await this.loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      // 1. Отримуємо всі групи для цієї категорії
      const groupsRef = collection(this.firestore, 'groups');
      const qGroups = query(groupsRef, where('categoryId', '==', categoryId));
      const groupsSnapshot = await getDocs(qGroups);

      const batch = writeBatch(this.firestore);

      // 2. Видаляємо саму категорію
      const categoryRef = doc(this.firestore, 'categories', categoryId);
      batch.delete(categoryRef);

      // 3. Видаляємо групи та їхніх ворогів
      for (const groupDoc of groupsSnapshot.docs) {
        // Видаляємо групу
        batch.delete(groupDoc.ref);

        // Знаходимо ворогів для цієї групи
        const enemiesRef = collection(this.firestore, 'enemies');
        const qEnemies = query(enemiesRef, where('groupId', '==', groupDoc.id));
        const enemiesSnapshot = await getDocs(qEnemies);

        // Видаляємо ворогів
        enemiesSnapshot.forEach(enemyDoc => {
          batch.delete(enemyDoc.ref);
        });
      }

      await batch.commit();

      // Оновлюємо дані
      await this.loadCategories();
      await this.loadGroups();
      await this.loadEnemies();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // ========== ГРУПИ ==========
  async loadGroups(): Promise<void> {
    try {
      const groupsRef = collection(this.firestore, 'groups');
      const q = query(groupsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const groups = querySnapshot.docs.map(doc =>
        this.convertToGroup(doc)
      );

      // Оновлюємо категорії з їх групами
      const updatedCategories = this._categories().map(category => ({
        ...category,
        groups: groups.filter(group => group.categoryId === category.id)
      }));

      this._categories.set(updatedCategories);
    } catch (error) {
      console.error('Error loading groups:', error);
      throw error;
    }
  }

  async addGroup(title: string, categoryId: string): Promise<string> {
    try {
      const groupsRef = collection(this.firestore, 'groups');
      const newGroup = {
        title,
        categoryId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(groupsRef, newGroup);

      await this.loadGroups();

      return docRef.id;
    } catch (error) {
      console.error('Error adding group:', error);
      throw error;
    }
  }

  async updateGroup(groupId: string, updates: Partial<EnemyGroup>): Promise<void> {
    try {
      const groupRef = doc(this.firestore, 'groups', groupId);
      await updateDoc(groupRef, {
        ...updates,
        updatedAt: new Date()
      });

      await this.loadGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    try {
      // Видаляємо групу
      const groupRef = doc(this.firestore, 'groups', groupId);
      await deleteDoc(groupRef);

      // Видаляємо пов'язаних ворогів
      const enemies = this._enemies().filter(enemy => enemy.groupId === groupId);
      const batch = writeBatch(this.firestore);

      enemies.forEach(enemy => {
        const enemyRef = doc(this.firestore, 'enemies', enemy.id);
        batch.delete(enemyRef);
      });

      await batch.commit();

      // Оновлюємо дані
      await this.loadGroups();
      await this.loadEnemies();
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // ========== ВОРОГИ ==========
  async loadEnemies(): Promise<void> {
    try {
      const enemiesRef = collection(this.firestore, 'enemies');
      const q = query(enemiesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const enemies = querySnapshot.docs.map(doc =>
        this.convertToEnemy(doc)
      );

      this._enemies.set(enemies);
    } catch (error) {
      console.error('Error loading enemies:', error);
      throw error;
    }
  }

  async addEnemy(enemyData: {
    name: string;
    elementName: ElementTypeName;
    avatarUrl: string;
    categoryId: string;
    groupId: string;
  }): Promise<string> {
    try {
      const enemiesRef = collection(this.firestore, 'enemies');
      const newEnemy = {
        name: enemyData.name,
        elementName: enemyData.elementName,
        elementIconUrl: `assets/images/ElementType_${enemyData.elementName}.png`,
        avatarUrl: enemyData.avatarUrl,
        specialMark: false,
        quantity: 1,
        categoryId: enemyData.categoryId,
        groupId: enemyData.groupId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(enemiesRef, newEnemy);

      await this.loadEnemies();

      return docRef.id;
    } catch (error) {
      console.error('Error adding enemy:', error);
      throw error;
    }
  }

  async updateEnemy(enemyId: string, updates: Partial<Enemy>): Promise<void> {
    try {
      const enemyRef = doc(this.firestore, 'enemies', enemyId);
      await updateDoc(enemyRef, {
        ...updates,
        updatedAt: new Date()
      });

      await this.loadEnemies();
    } catch (error) {
      console.error('Error updating enemy:', error);
      throw error;
    }
  }

  async deleteEnemy(enemyId: string): Promise<void> {
    try {
      const enemyRef = doc(this.firestore, 'enemies', enemyId);
      await deleteDoc(enemyRef);

      await this.loadEnemies();
    } catch (error) {
      console.error('Error deleting enemy:', error);
      throw error;
    }
  }

  // ========== ОБЧИСЛЮВАНІ ГЕТТЕРИ ==========
  getEnemiesForGroup(groupId: string): Enemy[] {
    // Виправлено: порівнюємо string з string
    return this._enemies().filter(enemy => enemy.groupId === groupId);
  }

  getEnemiesByGroup(groupId: string): Enemy[] {
    // Альтернативний метод з тією ж назвою, що ви використовуєте в компоненті
    return this.getEnemiesForGroup(groupId);
  }

  getGroupsForCategory(categoryId: string): EnemyGroup[] {
    const category = this._categories().find(c => c.id === categoryId);
    return category?.groups || [];
  }

  getActiveCategory(categoryId: string): EnemyCategory | undefined {
    return this._categories().find(c => c.id === categoryId);
  }

  // ========== ДОПОМІЖНІ МЕТОДИ ==========
  async initializeData(): Promise<void> {
    await this.loadAllData();
  }

  // ========== ЗАПИТИ FIREBASE ==========
  async getGroupsByCategoryFirestore(categoryId: string): Promise<EnemyGroup[]> {
    try {
      const groupsRef = collection(this.firestore, 'groups');
      const q = query(
        groupsRef,
        where('categoryId', '==', categoryId),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertToGroup(doc));
    } catch (error) {
      console.error('Error getting groups by category:', error);
      throw error;
    }
  }

  async getEnemiesByGroupFirestore(groupId: string): Promise<Enemy[]> {
    try {
      const enemiesRef = collection(this.firestore, 'enemies');
      const q = query(
        enemiesRef,
        where('groupId', '==', groupId),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertToEnemy(doc));
    } catch (error) {
      console.error('Error getting enemies by group:', error);
      throw error;
    }
  }
}
