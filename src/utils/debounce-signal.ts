import { signal, effect } from '@angular/core';

export function debounceSignal<T>(source: () => T, delay = 150) {
  const debounced = signal(source());
  let timer: any;

  effect(() => {
    const value = source();
    clearTimeout(timer);
    timer = setTimeout(() => debounced.set(value), delay);
  });

  return debounced;
}
