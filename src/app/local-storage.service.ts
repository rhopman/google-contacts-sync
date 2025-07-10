import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  getItem<T = string>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  setItem<T = string>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const stored = this.getItem<string>(key);
    return stored !== null ? stored === 'true' : defaultValue;
  }

  setBoolean(key: string, value: boolean): void {
    this.setItem(key, value.toString());
  }
}
