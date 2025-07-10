import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ContactPerson } from '../google/google-people-contacts.service';

@Component({
  selector: 'app-contact-card',
  templateUrl: './contact-card.html',
  styleUrls: [
    './contact-card.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ContactCardComponent {
  contact = input<ContactPerson>();
  greyedOut = input<boolean>();
  authUser = input<string | null>();

  refreshContact = output<ContactPerson>();
  deleteContact = output<ContactPerson>();

  protected readonly googleContactsUrl = computed(() => {
    const contact = this.contact();
    const authUser = this.authUser();
    if (!contact?.resourceName) return '';
    // Remove 'people/' prefix from resourceName if it exists
    const contactId = contact.resourceName.replace(/^people\//, '');
    const authUserPath = authUser ? `/u/${authUser}` : '';
    return `https://contacts.google.com${authUserPath}/person/${contactId}`;
  });

  protected openInGoogleContacts(): void {
    const url = this.googleContactsUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  protected onRefreshClick(event: Event): void {
    event.stopPropagation();
    const contact = this.contact();
    if (contact) {
      this.refreshContact.emit(contact);
    }
  }

  protected onDeleteClick(event: Event): void {
    event.stopPropagation();
    const contact = this.contact();
    if (contact) {
      this.deleteContact.emit(contact);
    }
  }

  protected formatBirthday(bday?: {
    date?: { year?: number; month?: number; day?: number };
  }): string {
    if (!bday?.date) return '';
    const { year, month, day } = bday.date;
    if (year) {
      return `${year}-${month?.toString().padStart(2, '0') ?? '??'}-${day?.toString().padStart(2, '0') ?? '??'}`;
    }
    if (month && day) {
      return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    return '';
  }
}
