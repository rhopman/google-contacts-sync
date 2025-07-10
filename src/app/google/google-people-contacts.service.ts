/**
 * GooglePeopleContactsService
 *
 * Manages fetching, updating, and storing Google Contacts for two accounts.
 * Uses signals for reactive state and loading indicators.
 *
 * - Fetches contacts from Google People API.
 * - Handles loading state for each account.
 * - Provides methods for CRUD operations on contacts.
 *
 * @see https://angular.dev/essentials/signals
 * @see https://developers.google.com/people
 */

import { Injectable, signal } from '@angular/core';

export interface ContactPerson {
  resourceName: string;
  names?: { displayName: string }[];
  emailAddresses?: { value: string }[];
  phoneNumbers?: { value: string }[];
  photos?: { url: string }[];
  memberships?: { contactGroupMembership?: { contactGroupResourceName?: string } }[];
  addresses?: { formattedValue?: string }[];
  birthdays?: { date?: { year?: number; month?: number; day?: number } }[];
  biographies?: { value: string }[]; // Notes
  etag?: string;
}

@Injectable({ providedIn: 'root' })
export class GooglePeopleContactsService {
  readonly contacts1 = signal<ContactPerson[]>([]);
  readonly contacts2 = signal<ContactPerson[]>([]);
  readonly loadingContacts1 = signal(false);
  readonly loadingContacts2 = signal(false);

  async fetchContacts(token: string, groupResourceName: string, account: 1 | 2) {
    if (!groupResourceName) return;
    if (account === 1) this.loadingContacts1.set(true);
    else this.loadingContacts2.set(true);

    let allPeople: ContactPerson[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const url = `https://people.googleapis.com/v1/people/me/connections?pageSize=1000&personFields=names,emailAddresses,phoneNumbers,photos,memberships,addresses,biographies,birthdays${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`;
      const resp: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        if (account === 1) this.loadingContacts1.set(false);
        else this.loadingContacts2.set(false);
        return;
      }
      const data: { connections?: unknown[]; nextPageToken?: string } = await resp.json();
      const connections = (data.connections || []) as ContactPerson[];
      const people: ContactPerson[] = connections.filter((person: ContactPerson) => {
        const hasTargetGroup = person.memberships?.some(
          (m: { contactGroupMembership?: { contactGroupResourceName?: string } }) =>
            m.contactGroupMembership?.contactGroupResourceName === groupResourceName,
        );
        return hasTargetGroup;
      });
      allPeople = allPeople.concat(people);
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Sort contacts alphabetically by displayName (case-insensitive)
    allPeople.sort((a, b) => {
      const nameA = a.names?.[0]?.displayName?.toLowerCase() || '';
      const nameB = b.names?.[0]?.displayName?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

    if (account === 1) this.contacts1.set(allPeople);
    else this.contacts2.set(allPeople);
    if (account === 1) this.loadingContacts1.set(false);
    else this.loadingContacts2.set(false);
  }

  async createContact(
    token: string,
    sourceContact: ContactPerson,
    groupResourceName: string,
    account: 1 | 2,
  ): Promise<ContactPerson | null> {
    try {
      // Prepare the contact data for creation
      const contactData: {
        names?: { displayName: string; givenName?: string }[];
        emailAddresses?: { value: string }[];
        phoneNumbers?: { value: string }[];
        addresses?: { formattedValue: string }[];
        biographies?: { value: string }[]; // Notes
        memberships?: { contactGroupMembership?: { contactGroupResourceName?: string } }[];
        birthdays?: { date?: { year?: number; month?: number; day?: number } }[];
      } = {};

      // Add name
      if (sourceContact.names?.[0]?.displayName) {
        contactData.names = [
          {
            displayName: sourceContact.names[0].displayName,
            givenName: sourceContact.names[0].displayName, // Add givenName as well
          },
        ];
      }

      // Add email addresses
      if (sourceContact.emailAddresses?.length) {
        contactData.emailAddresses = sourceContact.emailAddresses.map((email) => ({
          value: email.value,
        }));
      }

      // Add phone numbers
      if (sourceContact.phoneNumbers?.length) {
        contactData.phoneNumbers = sourceContact.phoneNumbers.map((phone) => ({
          value: phone.value,
        }));
      }

      // Add addresses
      if (sourceContact.addresses?.length) {
        contactData.addresses = sourceContact.addresses.map((address) => ({
          formattedValue: address.formattedValue || '',
        }));
      }

      // Add biographies (notes)
      if (sourceContact.biographies?.length) {
        contactData.biographies = sourceContact.biographies.map((bio) => ({ value: bio.value }));
      }

      // Add birthdays
      if (sourceContact.birthdays?.length) {
        contactData.birthdays = sourceContact.birthdays.map((bday) => ({
          date: bday.date ? { ...bday.date } : undefined,
        }));
      }

      // Add group membership directly to the contact creation
      contactData.memberships = [
        {
          contactGroupMembership: {
            contactGroupResourceName: groupResourceName,
          },
        },
      ];

      // Create the contact
      const createUrl = 'https://people.googleapis.com/v1/people:createContact';
      const createResp = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!createResp.ok) {
        console.error('Failed to create contact:', await createResp.text());
        return null;
      }

      const newContact: ContactPerson = await createResp.json();

      // Verify the contact has the correct group membership
      const hasCorrectMembership = newContact.memberships?.some(
        (m) => m.contactGroupMembership?.contactGroupResourceName === groupResourceName,
      );

      // If the contact doesn't have the correct group membership, add it manually
      if (!hasCorrectMembership) {
        if (!newContact.memberships) {
          newContact.memberships = [];
        }
        newContact.memberships.push({
          contactGroupMembership: {
            contactGroupResourceName: groupResourceName,
          },
        });
      }

      // Add the new contact to the appropriate contacts list
      const currentContacts = account === 1 ? this.contacts1() : this.contacts2();
      const updatedContacts = [
        ...currentContacts,
        newContact,
      ].sort((a, b) => {
        const nameA = a.names?.[0]?.displayName?.toLowerCase() || '';
        const nameB = b.names?.[0]?.displayName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });

      if (account === 1) {
        this.contacts1.set(updatedContacts);
      } else {
        this.contacts2.set(updatedContacts);
      }

      return newContact;
    } catch (error) {
      console.error('Error creating contact:', error);
      return null;
    }
  }

  async deleteContact(token: string, resourceName: string, account: 1 | 2): Promise<boolean> {
    try {
      const deleteUrl = `https://people.googleapis.com/v1/${resourceName}:deleteContact`;
      const deleteResp = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!deleteResp.ok) {
        console.error('Failed to delete contact:', await deleteResp.text());
        return false;
      }

      // Remove the contact from the appropriate contacts list
      const currentContacts = account === 1 ? this.contacts1() : this.contacts2();
      const updatedContacts = currentContacts.filter(
        (contact) => contact.resourceName !== resourceName,
      );

      if (account === 1) {
        this.contacts1.set(updatedContacts);
      } else {
        this.contacts2.set(updatedContacts);
      }

      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  async refreshSingleContact(
    token: string,
    resourceName: string,
    groupResourceName: string,
    account: 1 | 2,
  ): Promise<ContactPerson | null> {
    try {
      const url = `https://people.googleapis.com/v1/${resourceName}?personFields=names,emailAddresses,phoneNumbers,photos,memberships,addresses,biographies,birthdays`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        console.error('Failed to refresh contact:', await resp.text());
        return null;
      }

      const refreshedContact: ContactPerson = await resp.json();

      // Check if the contact still belongs to the target group
      const hasTargetGroup = refreshedContact.memberships?.some(
        (m) => m.contactGroupMembership?.contactGroupResourceName === groupResourceName,
      );

      const currentContacts = account === 1 ? this.contacts1() : this.contacts2();
      let updatedContacts: ContactPerson[];

      if (hasTargetGroup) {
        // Update the contact in the list
        updatedContacts = currentContacts.map((contact) =>
          contact.resourceName === resourceName ? refreshedContact : contact,
        );
      } else {
        // Remove the contact from the list as it no longer belongs to the group
        updatedContacts = currentContacts.filter(
          (contact) => contact.resourceName !== resourceName,
        );
      }

      // Sort contacts alphabetically by displayName (case-insensitive)
      updatedContacts.sort((a, b) => {
        const nameA = a.names?.[0]?.displayName?.toLowerCase() || '';
        const nameB = b.names?.[0]?.displayName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });

      if (account === 1) {
        this.contacts1.set(updatedContacts);
      } else {
        this.contacts2.set(updatedContacts);
      }

      return hasTargetGroup ? refreshedContact : null;
    } catch (error) {
      console.error('Error refreshing contact:', error);
      return null;
    }
  }

  async updateContact(
    token: string,
    targetContact: ContactPerson,
    sourceContact: ContactPerson,
    account: 1 | 2,
  ): Promise<ContactPerson | null> {
    try {
      if (!targetContact.resourceName) {
        console.error('Target contact has no resourceName');
        return null;
      }

      // Prepare the updated contact data
      const updateData: {
        resourceName: string;
        names?: { displayName: string; givenName: string }[];
        emailAddresses?: { value: string }[];
        phoneNumbers?: { value: string }[];
        addresses?: { formattedValue: string }[];
        biographies?: { value: string }[]; // Notes
        memberships?: { contactGroupMembership?: { contactGroupResourceName?: string } }[];
        birthdays?: { date?: { year?: number; month?: number; day?: number } }[];
        etag?: string;
      } = {
        resourceName: targetContact.resourceName,
        etag: targetContact.etag, // Include etag for optimistic concurrency
      };

      // Update name (keep the display name the same as it should be identical)
      if (sourceContact.names?.[0]?.displayName) {
        updateData.names = [
          {
            displayName: sourceContact.names[0].displayName,
            givenName: sourceContact.names[0].displayName,
          },
        ];
      }

      // Update email addresses
      if (sourceContact.emailAddresses?.length) {
        updateData.emailAddresses = sourceContact.emailAddresses.map((email) => ({
          value: email.value,
        }));
      } else {
        updateData.emailAddresses = [];
      }

      // Update phone numbers
      if (sourceContact.phoneNumbers?.length) {
        updateData.phoneNumbers = sourceContact.phoneNumbers.map((phone) => ({
          value: phone.value,
        }));
      } else {
        updateData.phoneNumbers = [];
      }

      // Update addresses
      if (sourceContact.addresses?.length) {
        updateData.addresses = sourceContact.addresses.map((address) => ({
          formattedValue: address.formattedValue || '',
        }));
      } else {
        updateData.addresses = [];
      }

      // Update birthdays
      if (sourceContact.birthdays?.length) {
        updateData.birthdays = sourceContact.birthdays.map((bday) => ({
          date: bday.date ? { ...bday.date } : undefined,
        }));
      } else {
        updateData.birthdays = [];
      }

      // Update biographies (notes)
      if (sourceContact.biographies?.length) {
        updateData.biographies = sourceContact.biographies.map((bio) => ({ value: bio.value }));
      } else {
        updateData.biographies = [];
      }

      // Preserve existing memberships
      updateData.memberships = targetContact.memberships;

      // Update the contact
      const updateUrl = `https://people.googleapis.com/v1/${targetContact.resourceName}:updateContact?updatePersonFields=names,emailAddresses,phoneNumbers,addresses,biographies,birthdays`;
      const updateResp = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!updateResp.ok) {
        console.error('Failed to update contact:', await updateResp.text());
        return null;
      }

      const updatedContact: ContactPerson = await updateResp.json();

      // Update the contact in the appropriate contacts list
      const currentContacts = account === 1 ? this.contacts1() : this.contacts2();
      const updatedContacts = currentContacts.map((contact) =>
        contact.resourceName === targetContact.resourceName ? updatedContact : contact,
      );

      // Sort contacts alphabetically by displayName (case-insensitive)
      updatedContacts.sort((a, b) => {
        const nameA = a.names?.[0]?.displayName?.toLowerCase() || '';
        const nameB = b.names?.[0]?.displayName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });

      if (account === 1) {
        this.contacts1.set(updatedContacts);
      } else {
        this.contacts2.set(updatedContacts);
      }

      return updatedContact;
    } catch (error) {
      console.error('Error updating contact:', error);
      return null;
    }
  }

  async renameContact(
    token: string,
    resourceName: string,
    newName: string,
    account: 1 | 2,
  ): Promise<ContactPerson | null> {
    try {
      // Fetch the contact first to get the latest etag
      const url = `https://people.googleapis.com/v1/${resourceName}?personFields=names,emailAddresses,phoneNumbers,photos,memberships,addresses,biographies`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        console.error('Failed to fetch contact for rename:', await resp.text());
        return null;
      }
      const contact: ContactPerson = await resp.json();
      if (!contact) return null;
      const updateData = {
        resourceName: contact.resourceName,
        etag: contact.etag,
        names: [
          { displayName: newName, givenName: newName },
        ],
        emailAddresses: contact.emailAddresses || [],
        phoneNumbers: contact.phoneNumbers || [],
        addresses: contact.addresses || [],
        biographies: contact.biographies || [], // Notes
        memberships: contact.memberships || [],
      };
      const updateUrl = `https://people.googleapis.com/v1/${resourceName}:updateContact?updatePersonFields=names`;
      const updateResp = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      if (!updateResp.ok) {
        console.error('Failed to rename contact:', await updateResp.text());
        return null;
      }
      const updatedContact: ContactPerson = await updateResp.json();
      // Update the contact in the appropriate contacts list
      const currentContacts = account === 1 ? this.contacts1() : this.contacts2();
      const updatedContacts = currentContacts.map((c) =>
        c.resourceName === resourceName ? updatedContact : c,
      );
      if (account === 1) {
        this.contacts1.set(updatedContacts);
      } else {
        this.contacts2.set(updatedContacts);
      }
      return updatedContact;
    } catch (error) {
      console.error('Error renaming contact:', error);
      return null;
    }
  }
}
