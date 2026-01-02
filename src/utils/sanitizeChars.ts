import { Season_details, Character, Enemy } from '../models/models';

export function sanitizeChars<T extends { avatarUrl?: string }>(chars: T[]): T[] {
  return chars.map((char) => {
    const { avatarUrl, ...rest } = char;
    // base64 → ВИДАЛЯЄМО
    if (avatarUrl?.startsWith('data:image')) {
      return {
        ...rest
        // avatar відсутній — Firestore-safe
      } as T;
    }

    // URL → зберігаємо
    if (avatarUrl?.startsWith('http') || avatarUrl?.startsWith('assets')) {
      // Keep as is for now, or if strict object matching is needed:
      return char;
    }

    // нічого
    return char;
  });
}

export function sanitizeSeasonDetails(details: Season_details): Season_details {
  const d = { ...details };

  // 1. Sanitize top-level characters
  d.opening_characters = sanitizeChars(d.opening_characters);
  d.special_guests = sanitizeChars(d.special_guests);

  // 2. Sanitize acts
  d.acts = d.acts.map(act => {
    const newAct = { ...act };

    // Sanitize enemy_selection
    if (newAct.enemy_selection) {
      newAct.enemy_selection = sanitizeChars(newAct.enemy_selection);
    }

    // Sanitize variations -> waves -> included_enemy
    if (newAct.variations) {
      newAct.variations = newAct.variations.map(variation => {
        const newVariation = { ...variation };
        if (newVariation.waves) {
          newVariation.waves = newVariation.waves.map(wave => {
            const newWave = { ...wave };
            if (newWave.included_enemy) {
              newWave.included_enemy = sanitizeChars(newWave.included_enemy);
            }
            return newWave;
          });
        }
        return newVariation;
      });
    }

    return newAct;
  });

  return d;
}
