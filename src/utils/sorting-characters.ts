import { Character } from "@models/models";

export function sortCharacters(list: Character[]): Character[] {
  return [...list].sort((a, b) => {
    if (a.rarity.name !== b.rarity.name) {
      return a.rarity.name === 'legendary' ? -1 : 1;
    }
    return (b.newIndex?.expiresAt ?? 0) - (a.newIndex?.expiresAt ?? 0);
  });
}
