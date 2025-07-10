import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { AccountControlsComponent } from './account-controls/account-controls.component';
import { ContactCardComponent } from './contact-card/contact-card.component';
import { CreateContactPlaceholderComponent } from './create-contact-placeholder/create-contact-placeholder.component';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog.component';
import { GoogleAuthService } from './google/google-auth.service';
import {
  ContactPerson,
  GooglePeopleContactsService,
} from './google/google-people-contacts.service';
import { GooglePeopleService } from './google/google-people.service';
import { LocalStorageService } from './local-storage.service';
import { RenameContactsDialogComponent } from './rename-contacts-dialog.component';
import { SnackbarService } from './snackbar.service';
import { SyncConfirmationDialog } from './sync-confirmation-dialog.component';
import { TopNavComponent } from './top-nav/top-nav.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: [
    './app.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountControlsComponent,
    ContactCardComponent,
    CreateContactPlaceholderComponent,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    MatSlideToggleModule,
    NgTemplateOutlet,
    TopNavComponent,
  ],
})
export class App {
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly people = inject(GooglePeopleService);
  private readonly peopleContacts = inject(GooglePeopleContactsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly localStorage = inject(LocalStorageService);

  protected readonly account1Connected = this.googleAuth.account1;
  protected readonly account2Connected = this.googleAuth.account2;
  protected readonly account1AuthUser = this.googleAuth.account1AuthUser;
  protected readonly account2AuthUser = this.googleAuth.account2AuthUser;
  protected readonly groups1 = this.people.groups1;
  protected readonly groups2 = this.people.groups2;
  protected readonly loading1 = this.people.loading1;
  protected readonly loading2 = this.people.loading2;
  protected readonly contacts1 = this.peopleContacts.contacts1;
  protected readonly contacts2 = this.peopleContacts.contacts2;
  protected readonly loadingContacts1 = this.peopleContacts.loadingContacts1;
  protected readonly loadingContacts2 = this.peopleContacts.loadingContacts2;
  protected readonly selectedGroup1 = signal<string | null>(
    this.localStorage.getItem<string>('selectedGroup1'),
  );
  protected readonly selectedGroup2 = signal<string | null>(
    this.localStorage.getItem<string>('selectedGroup2'),
  );
  protected readonly showIdenticalContacts = signal(
    this.localStorage.getBoolean('showIdenticalContacts', false),
  );
  protected readonly account1Name = this.people.account1Name;
  protected readonly account2Name = this.people.account2Name;
  protected readonly creatingContacts = signal(new Set<string>());
  protected readonly recentlyUpdatedContacts = signal(new Set<string>());

  /**
   * Use input() signals for AccountControlsComponent and pass signals directly for optimal reactivity.
   */
  protected readonly selectedGroup1Signal = signal<string | null>(
    this.localStorage.getItem<string>('selectedGroup1'),
  );
  protected readonly selectedGroup2Signal = signal<string | null>(
    this.localStorage.getItem<string>('selectedGroup2'),
  );

  // Functions for AccountControlsComponent inputs
  public readonly account1ConnectedFn = () => !!this.account1Connected();
  public readonly account2ConnectedFn = () => !!this.account2Connected();
  public readonly account1LabelFn = () => 'Google Account 1';
  public readonly account2LabelFn = () => 'Google Account 2';

  /**
   * Align contacts from both accounts by display name.
   * Each entry is { name, contact1, contact2, contactsAreIdentical }.
   */
  protected readonly alignedContacts = computed(() => {
    const contacts1 = this.contacts1();
    const contacts2 = this.contacts2();
    const map1 = new Map<string, (typeof contacts1)[number]>();
    const map2 = new Map<string, (typeof contacts2)[number]>();

    for (const c of contacts1) {
      const name = c.names?.[0]?.displayName?.trim() || '';
      if (name) map1.set(name, c);
    }

    for (const c of contacts2) {
      const name = c.names?.[0]?.displayName?.trim() || '';
      if (name) map2.set(name, c);
    }

    const allNames = new Set([
      ...map1.keys(),
      ...map2.keys(),
    ]);

    const alignedContacts = Array.from(allNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        contact1: map1.get(name) ?? undefined,
        contact2: map2.get(name) ?? undefined,
        contactsAreIdentical: contactsAreIdentical(map1.get(name), map2.get(name)),
      }));

    return alignedContacts;
  });

  /**
   * Filtered aligned contacts based on the showIdenticalContacts toggle
   */
  protected readonly filteredAlignedContacts = computed(() => {
    const contacts = this.alignedContacts();
    const showIdentical = this.showIdenticalContacts();

    if (showIdentical) {
      return contacts;
    }

    // Filter out contacts that are identical, unless they are recently created
    return contacts.filter(
      (pair) => !pair.contactsAreIdentical || this.isRecentlyUpdatedContact(pair.name),
    );
  });

  constructor() {
    this.googleAuth.init();
    effect(() => {
      const token1 = this.account1Connected();
      if (token1) {
        this.people.fetchGroups(token1, 1);
        this.people.fetchAccountName(token1, 1);
      }
      const token2 = this.account2Connected();
      if (token2) {
        this.people.fetchGroups(token2, 2);
        this.people.fetchAccountName(token2, 2);
      }
    });
    // Split effects so each only fetches its own contacts
    effect(() => {
      const group1 = this.selectedGroup1();
      const token1 = this.account1Connected();
      if (token1 && group1) {
        this.peopleContacts.fetchContacts(token1, group1, 1);
      } else {
        this.contacts1.set([]);
      }
    });
    effect(() => {
      const group2 = this.selectedGroup2();
      const token2 = this.account2Connected();
      if (token2 && group2) {
        this.peopleContacts.fetchContacts(token2, group2, 2);
      } else {
        this.contacts2.set([]);
      }
    });
    // Store group selections in localStorage when they change
    effect(() => {
      this.storeGroup('selectedGroup1', this.selectedGroup1());
    });
    effect(() => {
      this.storeGroup('selectedGroup2', this.selectedGroup2());
    });
    // Store toggle state in localStorage when it changes
    effect(() => {
      this.storeBoolean('showIdenticalContacts', this.showIdenticalContacts());
    });
    // Sync signals and localStorage
    effect(() => {
      this.storeGroup('selectedGroup1', this.selectedGroup1Signal());
    });
    effect(() => {
      this.storeGroup('selectedGroup2', this.selectedGroup2Signal());
    });
  }

  /**
   * Return an array that has the same length as the amount of contacts currently shown. Used for the divider.
   */
  dummyContacts() {
    let numberOfContacts = 0;
    if (
      this.selectedGroup1() &&
      this.selectedGroup2() &&
      !this.loadingContacts1() &&
      !this.loadingContacts2()
    ) {
      numberOfContacts = this.filteredAlignedContacts().length;
    } else if (this.selectedGroup1() && !this.selectedGroup2() && !this.loadingContacts1()) {
      numberOfContacts = this.contacts1().length;
    } else if (this.selectedGroup2() && !this.selectedGroup1() && !this.loadingContacts2()) {
      numberOfContacts = this.contacts2().length;
    }

    return Array.from({ length: numberOfContacts }, (_, i) => i);
  }

  reloadContacts1() {
    const group1 = this.selectedGroup1();
    const token1 = this.account1Connected();
    if (token1 && group1) {
      this.peopleContacts.fetchContacts(token1, group1, 1);
    }
  }

  reloadContacts2() {
    const group2 = this.selectedGroup2();
    const token2 = this.account2Connected();
    if (token2 && group2) {
      this.peopleContacts.fetchContacts(token2, group2, 2);
    }
  }

  private getStoredGroup(key: string): string | null {
    return this.localStorage.getItem<string>(key);
  }

  private getStoredBoolean(key: string, defaultValue: boolean): boolean {
    return this.localStorage.getBoolean(key, defaultValue);
  }

  private storeGroup(key: string, value: string | null): void {
    if (value) {
      this.localStorage.setItem(key, value);
    } else {
      this.localStorage.removeItem(key);
    }
  }

  private storeBoolean(key: string, value: boolean): void {
    this.localStorage.setBoolean(key, value);
  }

  protected getGoogleContactsUrl(authUser: string | null): string {
    if (!authUser) return 'https://contacts.google.com';
    return `https://contacts.google.com/u/${authUser}`;
  }

  protected async createContact(account: 1 | 2, sourceContact: ContactPerson): Promise<void> {
    const token = account === 1 ? this.account1Connected() : this.account2Connected();
    const groupResourceName = account === 1 ? this.selectedGroup1() : this.selectedGroup2();
    const contactKey = `${account}-${sourceContact.names?.[0]?.displayName || 'unknown'}`;

    if (!token || !groupResourceName || this.creatingContacts().has(contactKey)) return;

    this.creatingContacts.update(
      (set) =>
        new Set([
          ...set,
          contactKey,
        ]),
    );
    try {
      const newContact = await this.peopleContacts.createContact(
        token,
        sourceContact,
        groupResourceName,
        account,
      );
      if (newContact) {
        // Contact created successfully
      } else {
        this.snackbar.show(`Failed to create contact in account ${account}`);
      }
    } catch {
      this.snackbar.show(`Error creating contact in account ${account}`);
    } finally {
      this.creatingContacts.update((set) => {
        const newSet = new Set(set);
        newSet.delete(contactKey);
        return newSet;
      });

      // Add to recently created contacts
      this.addRecentlyUpdatedContact(sourceContact);
    }
  }

  private addRecentlyUpdatedContact(sourceContact: ContactPerson) {
    this.recentlyUpdatedContacts.update((set) => {
      const newSet = new Set(set);
      const displayName = sourceContact.names?.[0]?.displayName;
      if (displayName) {
        newSet.add(displayName);
      }
      return newSet;
    });
  }

  protected isCreatingContact(account: 1 | 2, contactName: string): boolean {
    const contactKey = `${account}-${contactName}`;
    return this.creatingContacts().has(contactKey);
  }

  protected isRecentlyUpdatedContact(contactName: string): boolean {
    return this.recentlyUpdatedContacts().has(contactName);
  }

  protected async refreshContact(contact: ContactPerson, account: 1 | 2): Promise<void> {
    const token = account === 1 ? this.account1Connected() : this.account2Connected();
    const groupResourceName = account === 1 ? this.selectedGroup1() : this.selectedGroup2();

    if (!token || !groupResourceName || !contact.resourceName) return;

    await this.peopleContacts.refreshSingleContact(
      token,
      contact.resourceName,
      groupResourceName,
      account,
    );

    this.addRecentlyUpdatedContact(contact);
  }

  protected async deleteContact(contact: ContactPerson, account: 1 | 2): Promise<void> {
    const token = account === 1 ? this.account1Connected() : this.account2Connected();

    if (!token || !contact.resourceName) return;

    // Show confirmation dialog
    const dialogRef = this.dialog.open(DeleteConfirmationDialog, {
      data: { contactName: contact.names?.[0]?.displayName || 'Unknown Contact' },
      width: '400px',
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());

    if (confirmed) {
      const success = await this.peopleContacts.deleteContact(token, contact.resourceName, account);
      if (!success) {
        this.snackbar.show('Failed to delete contact');
      }
    }
  }

  /**
   * Sync a contact from one account to the other.
   * @param sourceContact The contact to copy from
   * @param targetContact The contact to update
   * @param direction 'left-to-right' | 'right-to-left'
   */
  protected async syncContact(
    sourceContact: ContactPerson,
    targetContact: ContactPerson,
    direction: 'left-to-right' | 'right-to-left',
  ): Promise<void> {
    const targetToken =
      direction === 'right-to-left' ? this.account1Connected() : this.account2Connected();
    if (!targetToken) return;

    // Show confirmation dialog
    const dialogRef = this.dialog.open(SyncConfirmationDialog, {
      data: {
        direction,
        sourceContact,
        targetContact,
        sourceAccountName:
          direction === 'left-to-right'
            ? this.account1Name() || 'Google Account 1'
            : this.account2Name() || 'Google Account 2',
        targetAccountName:
          direction === 'right-to-left'
            ? this.account1Name() || 'Google Account 1'
            : this.account2Name() || 'Google Account 2',
      },
      width: '500px',
      maxHeight: '80vh',
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());

    if (confirmed) {
      const updatedContact = await this.peopleContacts.updateContact(
        targetToken,
        targetContact,
        sourceContact,
        direction === 'right-to-left' ? 1 : 2,
      );
      if (updatedContact) {
        // Add to recently created contacts so it remains visible
        this.addRecentlyUpdatedContact(updatedContact);
      } else {
        this.snackbar.show('Failed to sync contact');
      }
    }
  }

  protected async renameBothContacts(pair: {
    contact1: ContactPerson;
    contact2: ContactPerson;
    name: string;
  }) {
    const token1 = this.account1Connected();
    const token2 = this.account2Connected();
    if (!token1 || !token2 || !pair.contact1.resourceName || !pair.contact2.resourceName) return;

    // Open dialog
    const dialogRef = this.dialog.open(RenameContactsDialogComponent, {
      width: '400px',
      data: { name: pair.name },
      maxHeight: '80vh',
    });
    const newName = await firstValueFrom(dialogRef.afterClosed());
    if (!newName || newName === pair.name) return;

    // Update both contacts in parallel
    await Promise.all([
      this.peopleContacts.renameContact(token1, pair.contact1.resourceName, newName, 1),
      this.peopleContacts.renameContact(token2, pair.contact2.resourceName, newName, 2),
    ]);
    // Mark as recently updated so it remains visible
    this.recentlyUpdatedContacts.update((set) => {
      const newSet = new Set(set);
      newSet.add(newName);
      return newSet;
    });
  }

  /**
   * trackBy function for aligned contact pairs, using name for identity.
   */
  trackByPairName(_index: number, pair: { name: string }): string {
    return pair.name;
  }

  /**
   * trackBy function for contacts, using resourceName for identity.
   */
  trackByContactResourceName(_index: number, contact: ContactPerson): string {
    return contact.resourceName;
  }
}

function contactsAreIdentical(a: ContactPerson | undefined, b: ContactPerson | undefined): boolean {
  if (!a || !b) return false;

  // Compare displayName
  if ((a.names?.[0]?.displayName || '') !== (b.names?.[0]?.displayName || '')) return false;

  // Compare emails
  const emailsA = (a.emailAddresses ?? []).map((e) => e?.value || '').sort();
  const emailsB = (b.emailAddresses ?? []).map((e) => e?.value || '').sort();
  if (emailsA.length !== emailsB.length || emailsA.some((v, i) => v !== emailsB[i])) return false;

  // Compare phones
  const phonesA = (a.phoneNumbers ?? []).map((p) => p?.value || '').sort();
  const phonesB = (b.phoneNumbers ?? []).map((p) => p?.value || '').sort();
  if (phonesA.length !== phonesB.length || phonesA.some((v, i) => v !== phonesB[i])) return false;

  // Compare addresses
  const addressesA = (a.addresses ?? []).map((ad) => ad?.formattedValue || '').sort();
  const addressesB = (b.addresses ?? []).map((ad) => ad?.formattedValue || '').sort();
  if (addressesA.length !== addressesB.length || addressesA.some((v, i) => v !== addressesB[i]))
    return false;

  // Compare birthdays
  const birthdaysA = (a.birthdays ?? [])
    .map((bday: { date?: { year?: number; month?: number; day?: number } }) =>
      bday?.date ? `${bday.date.year ?? ''}-${bday.date.month ?? ''}-${bday.date.day ?? ''}` : '',
    )
    .sort();
  const birthdaysB = (b.birthdays ?? [])
    .map((bday: { date?: { year?: number; month?: number; day?: number } }) =>
      bday?.date ? `${bday.date.year ?? ''}-${bday.date.month ?? ''}-${bday.date.day ?? ''}` : '',
    )
    .sort();
  if (birthdaysA.length !== birthdaysB.length || birthdaysA.some((v, i) => v !== birthdaysB[i]))
    return false;

  // Compare biographies (notes)
  const biosA = (a.biographies ?? []).map((bio) => bio?.value?.trim() || '').sort();
  const biosB = (b.biographies ?? []).map((bio) => bio?.value?.trim() || '').sort();
  if (biosA.length !== biosB.length || biosA.some((v, i) => v !== biosB[i])) return false;

  return true;
}
