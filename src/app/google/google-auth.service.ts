/**
 * GoogleAuthService
 *
 * Handles authentication and token management for Google accounts using Google Identity Services.
 * Uses signals for reactive state management.
 *
 * - Stores and manages tokens for two Google accounts.
 * - Provides methods for login, logout, and token refresh.
 * - Persists tokens in LocalStorage via LocalStorageService.
 *
 * @see https://angular.dev/essentials/signals
 * @see https://developers.google.com/identity
 */

import { Injectable, inject, signal } from '@angular/core';
import { clientId } from '../environment';
import { LocalStorageService } from '../local-storage.service';
import type { GoogleCredentialResponse } from './google-identity.d';

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: string;
          }) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token: string;
              expires_in?: number;
              authuser?: string;
            }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly localStorage = inject(LocalStorageService);

  // Store tokens or user info for each account
  readonly account1 = signal<string | null>(
    this.localStorage.getItem<string>('google_account1_token') ?? null,
  );
  readonly account2 = signal<string | null>(
    this.localStorage.getItem<string>('google_account2_token') ?? null,
  );

  // Store authuser values for each account
  readonly account1AuthUser = signal<string | null>(
    this.localStorage.getItem<string>('google_account1_authuser') ?? null,
  );
  readonly account2AuthUser = signal<string | null>(
    this.localStorage.getItem<string>('google_account2_authuser') ?? null,
  );

  private initialized = false;
  private expiryTimeout1: ReturnType<typeof setTimeout> | null = null;
  private expiryTimeout2: ReturnType<typeof setTimeout> | null = null;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    // Load Google Identity Services script if not already present
    const scriptSrc = 'https://accounts.google.com/gsi/client';
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      script.defer = true;
      script.onload = () => this.onGsiLoaded();
      document.head.appendChild(script);
    } else {
      this.onGsiLoaded();
    }
  }

  private onGsiLoaded() {
    const now = Date.now();

    const exp1 = this.localStorage.getItem<string>('google_account1_exp');
    if (exp1) {
      if (Number(exp1) <= now) {
        this.signOut(1);
      } else {
        this.scheduleExpiry(1, Number(exp1));
      }
    }

    const exp2 = this.localStorage.getItem<string>('google_account2_exp');
    if (exp2) {
      if (Number(exp2) <= now) {
        this.signOut(2);
      } else {
        this.scheduleExpiry(2, Number(exp2));
      }
    }
  }

  signIn(account: 1 | 2) {
    this.init();
    const tryInit = () => {
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/contacts openid profile email',
          callback: (response: {
            access_token: string;
            expires_in?: number;
            authuser?: string;
          }) => {
            if (response.access_token) {
              // Default to 1 hour if expires_in not provided
              const expiresIn = response.expires_in ? response.expires_in : 3600;
              const exp = Date.now() + expiresIn * 1000 - 60000; // renew 1 min before expiry
              if (account === 1) {
                this.account1.set(response.access_token);
                this.localStorage.setItem('google_account1_token', response.access_token);
                this.localStorage.setItem('google_account1_exp', exp.toString());
                if (response.authuser) {
                  this.account1AuthUser.set(response.authuser);
                  this.localStorage.setItem('google_account1_authuser', response.authuser);
                }
                this.scheduleExpiry(1, exp);
              } else {
                this.account2.set(response.access_token);
                this.localStorage.setItem('google_account2_token', response.access_token);
                this.localStorage.setItem('google_account2_exp', exp.toString());
                if (response.authuser) {
                  this.account2AuthUser.set(response.authuser);
                  this.localStorage.setItem('google_account2_authuser', response.authuser);
                }
                this.scheduleExpiry(2, exp);
              }
            }
          },
        });
        tokenClient.requestAccessToken();
      } else {
        setTimeout(tryInit, 100);
      }
    };
    tryInit();
  }

  private scheduleExpiry(account: 1 | 2, exp: number) {
    const now = Date.now();
    const ms = exp - now;
    if (ms <= 0) {
      // Expired, sign out now
      this.signOut(account);
      return;
    }
    if (account === 1) {
      if (this.expiryTimeout1) clearTimeout(this.expiryTimeout1);
      this.expiryTimeout1 = setTimeout(() => this.signOut(1), ms);
    } else {
      if (this.expiryTimeout2) clearTimeout(this.expiryTimeout2);
      this.expiryTimeout2 = setTimeout(() => this.signOut(2), ms);
    }
  }

  signOut(account: 1 | 2) {
    if (account === 1) {
      this.account1.set(null);
      this.account1AuthUser.set(null);
      this.localStorage.removeItem('google_account1_token');
      this.localStorage.removeItem('google_account1_exp');
      this.localStorage.removeItem('google_account1_authuser');
      this.localStorage.removeItem('google_account1_name');
      this.localStorage.removeItem('selectedGroup1');
      if (this.expiryTimeout1) {
        clearTimeout(this.expiryTimeout1);
        this.expiryTimeout1 = null;
      }
    } else {
      this.account2.set(null);
      this.account2AuthUser.set(null);
      this.localStorage.removeItem('google_account2_token');
      this.localStorage.removeItem('google_account2_exp');
      this.localStorage.removeItem('google_account2_authuser');
      this.localStorage.removeItem('google_account2_name');
      this.localStorage.removeItem('selectedGroup2');
      if (this.expiryTimeout2) {
        clearTimeout(this.expiryTimeout2);
        this.expiryTimeout2 = null;
      }
    }
  }
}
