import { Injectable, signal } from '@angular/core';

/**
 * GooglePeopleService
 *
 * Handles fetching and managing Google Contact Groups for two accounts.
 * Uses signals for state and loading indicators.
 *
 * - Fetches contact groups from Google People API.
 * - Manages account group state and loading.
 * - Handles token expiration and cleanup.
 *
 * @see https://angular.dev/essentials/signals
 * @see https://developers.google.com/people
 */

export interface ContactGroup {
  resourceName: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class GooglePeopleService {
  readonly groups1 = signal<ContactGroup[]>([]);
  readonly groups2 = signal<ContactGroup[]>([]);
  readonly loading1 = signal(false);
  readonly loading2 = signal(false);
  readonly account1Name = signal<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('google_account1_name') : null,
  );
  readonly account2Name = signal<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('google_account2_name') : null,
  );

  /**
   * Fetches Google Contact Groups for the specified account.
   *
   * @param token OAuth2 access token for the account
   * @param account Account number (1 or 2)
   * @returns Promise<void>
   */
  async fetchGroups(token: string, account: 1 | 2) {
    const url = 'https://people.googleapis.com/v1/contactGroups?groupFields=metadata,name';
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.status === 401) {
      // Token expired or invalid, clear it
      if (account === 1) {
        localStorage.removeItem('google_account1_token');
        localStorage.removeItem('google_account1_name');
        this.account1Name.set(null);
      } else {
        localStorage.removeItem('google_account2_token');
        localStorage.removeItem('google_account2_name');
        this.account2Name.set(null);
      }
      return;
    }
    if (!resp.ok) return;
    const data = await resp.json();
    const groups: ContactGroup[] = (data.contactGroups || []).map(
      (g: { resourceName: string; name: string }) => ({
        resourceName: g.resourceName,
        name: g.name,
      }),
    );
    if (account === 1) this.groups1.set(groups);
    else this.groups2.set(groups);
  }

  /**
   * Fetches and stores the display name for the specified account.
   *
   * @param token OAuth2 access token for the account
   * @param account Account number (1 or 2)
   * @returns Promise<void>
   */
  async fetchAccountName(token: string, account: 1 | 2) {
    const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const name = data.names?.[0]?.displayName || null;
    if (account === 1) {
      this.account1Name.set(name);
      if (typeof window !== 'undefined' && name) {
        localStorage.setItem('google_account1_name', name);
      }
    } else {
      this.account2Name.set(name);
      if (typeof window !== 'undefined' && name) {
        localStorage.setItem('google_account2_name', name);
      }
    }
  }
}
