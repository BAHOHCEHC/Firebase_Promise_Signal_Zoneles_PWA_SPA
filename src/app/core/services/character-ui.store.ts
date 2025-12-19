import { signal } from '@angular/core';

export const isCharacterModalOpen = signal(false);

export function openCharacterModal() {
  isCharacterModalOpen.set(true);
}

export function closeCharacterModal() {
  isCharacterModalOpen.set(false);
}
