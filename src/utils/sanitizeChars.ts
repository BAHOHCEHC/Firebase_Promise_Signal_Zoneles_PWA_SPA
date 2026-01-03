export function sanitizeChars(data: any): any {
  if (!data) return data;

  // Deep clone to avoid mutating the original state (which would break the UI)
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
      // Avoid infinite recursion if circular (though data shouldn't be)
      // and recurse into children
      removeAvatar(obj[key]);
    });
  };

  // Specific properties to check as per requirement
  if (clone.opening_characters) removeAvatar(clone.opening_characters);
  if (clone.special_guests) removeAvatar(clone.special_guests);
  if (clone.acts) removeAvatar(clone.acts);

  return clone;
}
