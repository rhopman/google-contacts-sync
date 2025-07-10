import { TestBed } from '@angular/core/testing';
import { GooglePeopleService } from './google-people.service';

describe('GooglePeopleService', () => {
  let service: GooglePeopleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GooglePeopleService,
      ],
    });
    service = TestBed.inject(GooglePeopleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signals', () => {
    it('should have initial values', () => {
      expect(service.groups1()).toEqual([]);
      expect(service.groups2()).toEqual([]);
      expect(service.loading1()).toBe(false);
      expect(service.loading2()).toBe(false);
      expect(service.account1Name()).toBeNull();
      expect(service.account2Name()).toBeNull();
    });
  });

  describe('fetchGroups', () => {
    let fetchMock: jest.Mock;
    let removeItemSpy: jest.SpyInstance;
    beforeEach(() => {
      fetchMock = jest.fn();
      global.fetch = fetchMock;
      removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
    });

    it('should update groups1 on success for account 1', async () => {
      const mockGroups = [
        { resourceName: 'r1', name: 'Friends' },
      ];
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ contactGroups: mockGroups }),
        } as Response),
      );
      await service.fetchGroups('token', 1);
      expect(service.groups1()).toEqual(mockGroups);
    });

    it('should update groups2 on success for account 2', async () => {
      const mockGroups = [
        { resourceName: 'r2', name: 'Family' },
      ];
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ contactGroups: mockGroups }),
        } as Response),
      );
      await service.fetchGroups('token', 2);
      expect(service.groups2()).toEqual(mockGroups);
    });

    it('should clear tokens and names on 401 for account 1', async () => {
      fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 401 } as Response));
      await service.fetchGroups('token', 1);
      expect(removeItemSpy).toHaveBeenCalledWith('google_account1_token');
      expect(removeItemSpy).toHaveBeenCalledWith('google_account1_name');
      expect(service.account1Name()).toBeNull();
    });

    it('should clear tokens and names on 401 for account 2', async () => {
      fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 401 } as Response));
      await service.fetchGroups('token', 2);
      expect(removeItemSpy).toHaveBeenCalledWith('google_account2_token');
      expect(removeItemSpy).toHaveBeenCalledWith('google_account2_name');
      expect(service.account2Name()).toBeNull();
    });
  });

  describe('fetchAccountName', () => {
    let fetchMock: jest.Mock;
    let setItemSpy: jest.SpyInstance;
    beforeEach(() => {
      fetchMock = jest.fn();
      global.fetch = fetchMock;
      setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    });

    it('should update account1Name and localStorage for account 1', async () => {
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: true,
          json: async () => ({
            names: [
              { displayName: 'Alice' },
            ],
          }),
        } as Response),
      );
      await service.fetchAccountName('token', 1);
      expect(service.account1Name()).toBe('Alice');
      expect(setItemSpy).toHaveBeenCalledWith('google_account1_name', 'Alice');
    });

    it('should update account2Name and localStorage for account 2', async () => {
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: true,
          json: async () => ({
            names: [
              { displayName: 'Bob' },
            ],
          }),
        } as Response),
      );
      await service.fetchAccountName('token', 2);
      expect(service.account2Name()).toBe('Bob');
      expect(setItemSpy).toHaveBeenCalledWith('google_account2_name', 'Bob');
    });

    it('should set name to null if not present', async () => {
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: true,
          json: async () => ({ names: [] }),
        } as Response),
      );
      await service.fetchAccountName('token', 1);
      expect(service.account1Name()).toBeNull();
    });
  });
});
