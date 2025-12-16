import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AdminToken {
  private readonly TOKEN_KEY = 'admin_token';
  private tokenSignal = signal<string | null>(this.getTokenFromStorage());

  constructor() {
    this.tokenSignal.set(this.getTokenFromStorage());
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }

  private getTokenFromStorage(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
