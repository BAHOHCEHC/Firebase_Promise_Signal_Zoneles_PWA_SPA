export function sanitizeChars(data: any): any {
  if (!data) return data;

  // Глибоке клонування, щоб уникнути мутації початкового стану (що може зламати UI)
  const clone = structuredClone(data);

  const removeAvatar = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => removeAvatar(item));
      return;
    }

    if ('avatarUrl' in obj) {
      delete obj['avatarUrl'];
    }

    Object.keys(obj).forEach(key => {
      // Уникнення нескінченної рекурсії, якщо є циклічні посилання (хоча дані не повинні їх мати)
      // і рекурсивний перехід до дочірніх елементів
      removeAvatar(obj[key]);
    });
  };

  // Специфічні властивості для перевірки згідно з вимогами
  if (clone.opening_characters) removeAvatar(clone.opening_characters);
  if (clone.special_guests) removeAvatar(clone.special_guests);
  if (clone.acts) removeAvatar(clone.acts);

  return clone;
}
