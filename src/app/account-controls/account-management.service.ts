import { Injectable, inject } from '@angular/core';
import { GoogleAuthService } from '../google/google-auth.service';

@Injectable({ providedIn: 'root' })
export class AccountManagementService {
  private readonly googleAuth = inject(GoogleAuthService);

  readonly account1Connected = this.googleAuth.account1;
  readonly account2Connected = this.googleAuth.account2;
  readonly account1AuthUser = this.googleAuth.account1AuthUser;
  readonly account2AuthUser = this.googleAuth.account2AuthUser;

  connectAccount(account: 1 | 2) {
    this.googleAuth.signIn(account);
  }

  disconnectAccount(account: 1 | 2) {
    this.googleAuth.signOut(account);
  }
}
