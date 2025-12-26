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

@Injectable({
  providedIn: 'root',
})
export class SeasonService {

}
