import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AccountManagementService } from './account-management.service';

export interface ContactGroup {
  resourceName: string;
  name: string;
}

@Component({
  selector: 'app-account-controls',
  templateUrl: './account-controls.component.html',
  styleUrls: [
    './account-controls.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
  ],
})
export class AccountControlsComponent {
  side = input<'left' | 'right'>();
  accountNumber = input<1 | 2>();
  accountName = input<string | null>();
  groups = input<ContactGroup[]>();
  selectedGroup = input<{ value: string | null; set: (v: string | null) => void }>();
  label = input<string>();

  private readonly accountService = inject(AccountManagementService);

  get accountConnected(): boolean {
    return this.accountNumber() === 1
      ? !!this.accountService.account1Connected()
      : !!this.accountService.account2Connected();
  }

  get authUser(): string | null {
    return this.accountNumber() === 1
      ? this.accountService.account1AuthUser()
      : this.accountService.account2AuthUser();
  }

  connectAccount() {
    const account = this.accountNumber() ?? 1;
    this.accountService.connectAccount(account);
  }

  disconnectAccount() {
    const account = this.accountNumber() ?? 1;
    this.accountService.disconnectAccount(account);
  }

  getGoogleContactsUrl(authUser: string | null): string {
    if (!authUser) return 'https://contacts.google.com';
    return `https://contacts.google.com/u/${authUser}`;
  }

  /**
   * trackBy function for contact groups, using resourceName for identity.
   *
   * @param _ index (unused)
   * @param group ContactGroup
   * @returns string resourceName
   */
  trackByGroupResourceName(_index: number, group: ContactGroup): string {
    return group.resourceName;
  }
}
