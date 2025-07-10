import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { ContactPerson, GooglePeopleContactsService } from './google-people-contacts.service';

describe('GooglePeopleContactsService', () => {
  let service: GooglePeopleContactsService;
  const token = 'test-token';
  const groupResourceName = 'test-group';
  const contact: ContactPerson = {
    resourceName: 'people/123',
    names: [
      { displayName: 'Alice' },
    ],
    emailAddresses: [
      { value: 'alice@example.com' },
    ],
    phoneNumbers: [
      { value: '1234567890' },
    ],
    memberships: [
      { contactGroupMembership: { contactGroupResourceName: groupResourceName } },
    ],
    etag: 'etag-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GooglePeopleContactsService,
      ],
    });
    service = TestBed.inject(GooglePeopleContactsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have empty contacts and loading signals initially', () => {
    expect(service.contacts1()).toEqual([]);
    expect(service.contacts2()).toEqual([]);
    expect(service.loadingContacts1()).toBe(false);
    expect(service.loadingContacts2()).toBe(false);
  });

  describe('fetchContacts', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            connections: [
              contact,
            ],
            nextPageToken: undefined,
          }),
      } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should fetch and set contacts for account 1', async () => {
      await service.fetchContacts(token, groupResourceName, 1);
      expect(service.contacts1()).toEqual([
        contact,
      ]);
      expect(service.loadingContacts1()).toBe(false);
    });

    it('should fetch and set contacts for account 2', async () => {
      await service.fetchContacts(token, groupResourceName, 2);
      expect(service.contacts2()).toEqual([
        contact,
      ]);
      expect(service.loadingContacts2()).toBe(false);
    });
  });

  describe('fetchContacts edge cases', () => {
    it('should return early if groupResourceName is missing', async () => {
      const result = await service.fetchContacts(token, '', 1);
      expect(result).toBeUndefined();
      expect(service.contacts1()).toEqual([]);
      expect(service.loadingContacts1()).toBe(false);
    });
  });

  describe('refreshSingleContact edge cases', () => {
    it('should remove contact if group membership is missing', async () => {
      const contactNoMembership = { ...contact, memberships: [] };
      service.contacts1.set([
        contactNoMembership,
      ]);
      (global as unknown as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(contactNoMembership),
      } as unknown as Response);
      const result = await service.refreshSingleContact(
        token,
        contact.resourceName,
        groupResourceName,
        1,
      );
      expect(result).toBeNull();
      expect(service.contacts1()).toEqual([]);
    });
  });

  describe('createContact', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(contact),
      } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should create and add a contact', async () => {
      const result = await service.createContact(token, contact, groupResourceName, 1);
      expect(result).toEqual(contact);
      expect(service.contacts1()).toContainEqual(contact);
    });
  });

  describe('deleteContact', () => {
    beforeEach(() => {
      service.contacts1.set([
        contact,
      ]);
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should delete a contact and update contacts1', async () => {
      const result = await service.deleteContact(token, contact.resourceName, 1);
      expect(result).toBe(true);
      expect(service.contacts1()).toEqual([]);
    });
  });

  describe('updateContact', () => {
    beforeEach(() => {
      service.contacts1.set([
        contact,
      ]);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...contact,
            names: [
              { displayName: 'Bob' },
            ],
          }),
      } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should update a contact', async () => {
      const updated = {
        ...contact,
        names: [
          { displayName: 'Bob' },
        ],
      };
      const result = await service.updateContact(token, contact, updated, 1);
      expect(result?.names?.[0].displayName).toBe('Bob');
      expect(service.contacts1()[0].names?.[0].displayName).toBe('Bob');
    });
  });

  describe('refreshSingleContact', () => {
    beforeEach(() => {
      service.contacts1.set([
        contact,
      ]);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(contact),
      } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should refresh a contact and keep it if group matches', async () => {
      const result = await service.refreshSingleContact(
        token,
        contact.resourceName,
        groupResourceName,
        1,
      );
      expect(result).toEqual(contact);
      expect(service.contacts1()).toContainEqual(contact);
    });
  });

  describe('renameContact', () => {
    beforeEach(() => {
      service.contacts1.set([
        contact,
      ]);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(contact),
        } as unknown as Response) // fetch contact
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...contact,
              names: [
                { displayName: 'Renamed' },
              ],
            }),
        } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should rename a contact', async () => {
      const result = await service.renameContact(token, contact.resourceName, 'Renamed', 1);
      expect(result?.names?.[0].displayName).toBe('Renamed');
      expect(service.contacts1()[0].names?.[0].displayName).toBe('Renamed');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('fail'),
      } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('fetchContacts should not throw on error', async () => {
      await expect(service.fetchContacts(token, groupResourceName, 1)).resolves.toBeUndefined();
      expect(service.loadingContacts1()).toBe(false);
    });
    it('createContact should return null on error', async () => {
      const result = await service.createContact(token, contact, groupResourceName, 1);
      expect(result).toBeNull();
    });
    it('deleteContact should return false on error', async () => {
      const result = await service.deleteContact(token, contact.resourceName, 1);
      expect(result).toBe(false);
    });
    it('updateContact should return null on error', async () => {
      const result = await service.updateContact(token, contact, contact, 1);
      expect(result).toBeNull();
    });
    it('refreshSingleContact should return null on error', async () => {
      const result = await service.refreshSingleContact(
        token,
        contact.resourceName,
        groupResourceName,
        1,
      );
      expect(result).toBeNull();
    });
    it('renameContact should return null on error', async () => {
      const result = await service.renameContact(token, contact.resourceName, 'Renamed', 1);
      expect(result).toBeNull();
    });
  });

  describe('error handling for account 2', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('fail'),
      } as unknown as Response);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('fetchContacts should not throw on error for account 2', async () => {
      await expect(service.fetchContacts(token, groupResourceName, 2)).resolves.toBeUndefined();
      expect(service.loadingContacts2()).toBe(false);
    });
    it('createContact should return null on error for account 2', async () => {
      const result = await service.createContact(token, contact, groupResourceName, 2);
      expect(result).toBeNull();
    });
    it('deleteContact should return false on error for account 2', async () => {
      const result = await service.deleteContact(token, contact.resourceName, 2);
      expect(result).toBe(false);
    });
    it('updateContact should return null on error for account 2', async () => {
      const result = await service.updateContact(token, contact, contact, 2);
      expect(result).toBeNull();
    });
    it('refreshSingleContact should return null on error for account 2', async () => {
      const result = await service.refreshSingleContact(
        token,
        contact.resourceName,
        groupResourceName,
        2,
      );
      expect(result).toBeNull();
    });
    it('renameContact should return null on error for account 2', async () => {
      const result = await service.renameContact(token, contact.resourceName, 'Renamed', 2);
      expect(result).toBeNull();
    });
  });

  describe('createContact group membership edge case', () => {
    it('should add group membership manually if missing', async () => {
      const contactNoMembership: ContactPerson = {
        ...contact,
        memberships: [],
      };
      (global as unknown as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...contactNoMembership }),
      } as unknown as Response);
      const result = await service.createContact(token, contactNoMembership, groupResourceName, 1);
      expect(
        result?.memberships?.some(
          (m) => m.contactGroupMembership?.contactGroupResourceName === groupResourceName,
        ),
      ).toBe(true);
    });
  });
});
