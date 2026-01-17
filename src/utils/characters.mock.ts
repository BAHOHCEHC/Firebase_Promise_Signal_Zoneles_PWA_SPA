import { Character, ElementType, CharacterRarityID } from '@models/models';

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

/* ===== Elements ===== */
export const ELEMENTS: ElementType[] = [
  { id: 1, name: 'pyro', iconUrl: 'assets/images/ElementType_pyro.png' },
  { id: 2, name: 'hydro', iconUrl: 'assets/images/ElementType_hydro.png' },
  { id: 3, name: 'electro', iconUrl: 'assets/images/ElementType_electro.png' },
  { id: 4, name: 'cryo', iconUrl: 'assets/images/ElementType_cryo.png' },
  { id: 5, name: 'dendro', iconUrl: 'assets/images/ElementType_dendro.png' },
  { id: 6, name: 'anemo', iconUrl: 'assets/images/ElementType_anemo.png' },
  { id: 7, name: 'geo', iconUrl: 'assets/images/ElementType_geo.png' },
];

/* ===== Rarity ===== */
export const RARITY = {
  legendary: {
    id: 1,
    name: 'legendary',
    bgUrl: 'assets/images/bg_legendary.png',
  } as CharacterRarityID,
  epic: {
    id: 2,
    name: 'epic',
    bgUrl: 'assets/images/bg_epic.png',
  } as CharacterRarityID,
};

/* ===== Helper ===== */
function createCharacter(
  id: number,
  rarity: CharacterRarityID,
  element: ElementType,
  isNew = false,
): Character {
  return {
    id: id.toString(),
    name: `Character ${id}`,
    avatarUrl: 'assets/images/char_icon.png',
    rarity,
    element,
    energy: 2,
    active: false,
    newIndex: isNew
      ? { value: true, expiresAt: now + day * 3 }
      : { value: false, expiresAt: now - day * 30 },
  };
}

/* ===== Characters ===== */
export const CHARACTERS_MOCK: Character[] = [
  // --- NEW legendary ---
  createCharacter(1, RARITY.legendary, ELEMENTS[0], true),
  createCharacter(2, RARITY.legendary, ELEMENTS[1], true),

  // --- legendary (32) ---
  ...Array.from({ length: 32 }, (_, i) =>
    createCharacter(
      i + 3,
      RARITY.legendary,
      ELEMENTS[i % ELEMENTS.length],
    ),
  ),

  // --- epic (28) ---
  ...Array.from({ length: 28 }, (_, i) =>
    createCharacter(
      i + 35,
      RARITY.epic,
      ELEMENTS[i % ELEMENTS.length],
    ),
  ),
];
