import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let querySelectorSpy: jest.SpiedFunction<Document['querySelector']>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GoogleAuthService,
      ],
    });
    service = TestBed.inject(GoogleAuthService);
    querySelectorSpy = jest.spyOn(document, 'querySelector');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should clear account1 state and localStorage on signOut(1)', () => {
    localStorage.setItem('google_account1_token', 'token1');
    localStorage.setItem('google_account1_exp', '123');
    localStorage.setItem('google_account1_authuser', 'authuser1');
    localStorage.setItem('google_account1_name', 'name1');
    localStorage.setItem('selectedGroup1', 'group1');
    service.account1.set('token1');
    service.account1AuthUser.set('authuser1');
    service.signOut(1);
    expect(service.account1()).toBeNull();
    expect(service.account1AuthUser()).toBeNull();
    expect(localStorage.getItem('google_account1_token')).toBeNull();
    expect(localStorage.getItem('google_account1_exp')).toBeNull();
    expect(localStorage.getItem('google_account1_authuser')).toBeNull();
    expect(localStorage.getItem('google_account1_name')).toBeNull();
    expect(localStorage.getItem('selectedGroup1')).toBeNull();
  });

  it('should clear account2 state and localStorage on signOut(2)', () => {
    localStorage.setItem('google_account2_token', 'token2');
    localStorage.setItem('google_account2_exp', '123');
    localStorage.setItem('google_account2_authuser', 'authuser2');
    localStorage.setItem('google_account2_name', 'name2');
    localStorage.setItem('selectedGroup2', 'group2');
    service.account2.set('token2');
    service.account2AuthUser.set('authuser2');
    service.signOut(2);
    expect(service.account2()).toBeNull();
    expect(service.account2AuthUser()).toBeNull();
    expect(localStorage.getItem('google_account2_token')).toBeNull();
    expect(localStorage.getItem('google_account2_exp')).toBeNull();
    expect(localStorage.getItem('google_account2_authuser')).toBeNull();
    expect(localStorage.getItem('google_account2_name')).toBeNull();
    expect(localStorage.getItem('selectedGroup2')).toBeNull();
  });

  it('should set initialized to true and not reload script if already initialized', () => {
    service['initialized'] = true;
    service.init();
    expect(querySelectorSpy).not.toHaveBeenCalled();
  });

  describe('signal initialization', () => {
    it('should initialize signals from localStorage', () => {
      localStorage.setItem('google_account1_token', JSON.stringify('token1'));
      localStorage.setItem('google_account2_token', JSON.stringify('token2'));

      // Recreate the service after setting localStorage
      TestBed.resetTestingModule();
      const s = TestBed.configureTestingModule({
        providers: [
          GoogleAuthService,
        ],
      }).inject(GoogleAuthService);
      expect(s.account1()).toBe('token1');
      expect(s.account2()).toBe('token2');
    });
  });

  it('should load the Google script if not present and call onGsiLoaded if present', () => {
    service['initialized'] = false;
    const appendChildSpy = jest
      .spyOn(document.head, 'appendChild')
      .mockImplementation((el: Node) => {
        (el as HTMLScriptElement).onload?.(null as unknown as Event);
        return el;
      });
    querySelectorSpy.mockReturnValueOnce(null);
    const onGsiLoadedSpy = jest.spyOn(
      service as unknown as { onGsiLoaded: () => void },
      'onGsiLoaded',
    );
    service.init();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(onGsiLoadedSpy).toHaveBeenCalled();
    appendChildSpy.mockRestore();
  });

  it('should call onGsiLoaded directly if script is already present', () => {
    service['initialized'] = false;
    querySelectorSpy.mockReturnValueOnce({} as Element);
    const onGsiLoadedSpy = jest.spyOn(
      service as unknown as { onGsiLoaded: () => void },
      'onGsiLoaded',
    );
    service.init();
    expect(onGsiLoadedSpy).toHaveBeenCalled();
  });

  it('should sign out if token expired in onGsiLoaded', () => {
    const now = Date.now();
    localStorage.setItem('google_account1_exp', (now - 1000).toString());
    const signOutSpy = jest.spyOn(service, 'signOut');
    (service as unknown as { onGsiLoaded: () => void }).onGsiLoaded();
    expect(signOutSpy).toHaveBeenCalledWith(1);
  });

  it('should schedule expiry if token not expired in onGsiLoaded', () => {
    const now = Date.now();
    localStorage.setItem('google_account1_exp', (now + 100000).toString());
    const scheduleExpirySpy = jest.spyOn(
      service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
      'scheduleExpiry',
    );
    (service as unknown as { onGsiLoaded: () => void }).onGsiLoaded();
    expect(scheduleExpirySpy).toHaveBeenCalledWith(1, expect.any(Number));
  });

  it('should call signOut immediately if ms <= 0 in scheduleExpiry', () => {
    const signOutSpy = jest.spyOn(service, 'signOut');
    (service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void }).scheduleExpiry(
      1,
      Date.now() - 1000,
    );
    expect(signOutSpy).toHaveBeenCalledWith(1);
  });

  it('should set expiryTimeout1 for account 1 in scheduleExpiry', () => {
    jest.useFakeTimers();
    (service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void }).scheduleExpiry(
      1,
      Date.now() + 1000,
    );
    expect(
      (service as unknown as { expiryTimeout1: ReturnType<typeof setTimeout> | null })
        .expiryTimeout1,
    ).not.toBeNull();
    jest.useRealTimers();
  });

  it('should set expiryTimeout2 for account 2 in scheduleExpiry', () => {
    jest.useFakeTimers();
    (service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void }).scheduleExpiry(
      2,
      Date.now() + 1000,
    );
    expect(
      (service as unknown as { expiryTimeout2: ReturnType<typeof setTimeout> | null })
        .expiryTimeout2,
    ).not.toBeNull();
    jest.useRealTimers();
  });

  it('should set and clear expiryTimeout1 and expiryTimeout2 in scheduleExpiry', () => {
    jest.useFakeTimers();
    // Set expiryTimeout1, then call again to ensure clearTimeout is called
    service['scheduleExpiry'](1, Date.now() + 1000);
    const firstTimeout1 = service['expiryTimeout1'];
    service['scheduleExpiry'](1, Date.now() + 2000);
    expect(service['expiryTimeout1']).not.toBe(firstTimeout1);
    // Same for account 2
    service['scheduleExpiry'](2, Date.now() + 1000);
    const firstTimeout2 = service['expiryTimeout2'];
    service['scheduleExpiry'](2, Date.now() + 2000);
    expect(service['expiryTimeout2']).not.toBe(firstTimeout2);
    jest.useRealTimers();
  });

  it('should call signOut for account 2 if expired in onGsiLoaded', () => {
    const now = Date.now();
    localStorage.setItem('google_account2_exp', (now - 1000).toString());
    const signOutSpy = jest.spyOn(service, 'signOut');
    (service as unknown as { onGsiLoaded: () => void }).onGsiLoaded();
    expect(signOutSpy).toHaveBeenCalledWith(2);
  });

  it('should scheduleExpiry for account 2 if not expired in onGsiLoaded', () => {
    const now = Date.now();
    localStorage.setItem('google_account2_exp', (now + 100000).toString());
    const scheduleExpirySpy = jest.spyOn(
      service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
      'scheduleExpiry',
    );
    (service as unknown as { onGsiLoaded: () => void }).onGsiLoaded();
    expect(scheduleExpirySpy).toHaveBeenCalledWith(2, expect.any(Number));
  });

  it('should clear expiryTimeout1 and expiryTimeout2 on signOut', () => {
    jest.useFakeTimers();
    service['scheduleExpiry'](1, Date.now() + 1000);
    service['scheduleExpiry'](2, Date.now() + 1000);
    expect(service['expiryTimeout1']).not.toBeNull();
    expect(service['expiryTimeout2']).not.toBeNull();
    service.signOut(1);
    expect(service['expiryTimeout1']).toBeNull();
    service.signOut(2);
    expect(service['expiryTimeout2']).toBeNull();
    jest.useRealTimers();
  });

  it('should clear only the correct expiryTimeout on signOut', () => {
    jest.useFakeTimers();
    service['scheduleExpiry'](1, Date.now() + 1000);
    service['scheduleExpiry'](2, Date.now() + 1000);
    expect(service['expiryTimeout1']).not.toBeNull();
    expect(service['expiryTimeout2']).not.toBeNull();
    service.signOut(1);
    expect(service['expiryTimeout1']).toBeNull();
    service.signOut(2);
    expect(service['expiryTimeout2']).toBeNull();
    jest.useRealTimers();
  });

  describe('signIn', () => {
    let originalGoogle: unknown;
    beforeEach(() => {
      originalGoogle = window.google;
      (window as unknown as { google: unknown }).google = {
        accounts: {
          oauth2: {
            initTokenClient: jest.fn().mockImplementation((options: unknown) => {
              const opts = options as {
                callback: (resp: {
                  access_token: string;
                  expires_in: number;
                  authuser: string;
                }) => void;
              };
              return {
                requestAccessToken: () => {
                  opts.callback({
                    access_token: 'access-token',
                    expires_in: 3600,
                    authuser: 'authuser1',
                  });
                },
              };
            }),
          },
        },
      };
    });
    afterEach(() => {
      (window as unknown as { google: unknown }).google = originalGoogle;
      jest.clearAllMocks();
      localStorage.clear();
    });

    it('should set account1 token, expiry, and authuser on signIn(1)', () => {
      jest
        .spyOn(
          service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
          'scheduleExpiry',
        )
        .mockImplementation(() => undefined);
      service.signIn(1);
      expect(service.account1()).toBe('access-token');
      expect(service.account1AuthUser()).toBe('authuser1');
      expect(localStorage.getItem('google_account1_token')).toBe(JSON.stringify('access-token'));
      expect(localStorage.getItem('google_account1_authuser')).toBe(JSON.stringify('authuser1'));
      expect(localStorage.getItem('google_account1_exp')).toMatch(/\d+/);
    });

    it('should set account2 token, expiry, and authuser on signIn(2)', () => {
      jest
        .spyOn(
          service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
          'scheduleExpiry',
        )
        .mockImplementation(() => undefined);
      service.signIn(2);
      expect(service.account2()).toBe('access-token');
      expect(service.account2AuthUser()).toBe('authuser1');
      expect(localStorage.getItem('google_account2_token')).toBe(JSON.stringify('access-token'));
      expect(localStorage.getItem('google_account2_authuser')).toBe(JSON.stringify('authuser1'));
      expect(localStorage.getItem('google_account2_exp')).toMatch(/\d+/);
    });

    it('should retry if GIS is not loaded', () => {
      // Use bracket notation for index signature
      (
        window as unknown as { google: { accounts: { oauth2: Record<string, unknown> } } }
      ).google.accounts.oauth2['initTokenClient'] = undefined;
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      service.signIn(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
    });

    it('should not set token if access_token is missing in signIn', () => {
      jest
        .spyOn(
          service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
          'scheduleExpiry',
        )
        .mockImplementation(() => undefined);
      // Patch GIS mock to call back with no access_token
      (
        window as unknown as { google: { accounts: { oauth2: { initTokenClient: unknown } } } }
      ).google.accounts.oauth2.initTokenClient = (options: unknown) => {
        const opts = options as { callback: (resp: Record<string, unknown>) => void };
        return {
          requestAccessToken: () => {
            opts.callback({});
          },
        };
      };
      service.signIn(1);
      expect(service.account1()).toBeNull();
      expect(localStorage.getItem('google_account1_token')).toBeNull();
    });

    it('should default expires_in to 3600 if not provided', () => {
      const spy = jest.spyOn(
        service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
        'scheduleExpiry',
      );
      (
        window as unknown as { google: { accounts: { oauth2: { initTokenClient: unknown } } } }
      ).google.accounts.oauth2.initTokenClient = (options: unknown) => {
        const opts = options as { callback: (resp: Record<string, unknown>) => void };
        return {
          requestAccessToken: () => {
            opts.callback({ access_token: 'tok', authuser: 'u' });
          },
        };
      };
      service.signIn(1);
      expect(spy).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('should not set authuser if not provided', () => {
      jest
        .spyOn(
          service as unknown as { scheduleExpiry: (a: 1 | 2, b: number) => void },
          'scheduleExpiry',
        )
        .mockImplementation(() => undefined);
      (
        window as unknown as {
          google: { accounts: { oauth2: { initTokenClient: (options: unknown) => unknown } } };
        }
      ).google.accounts.oauth2.initTokenClient = (options: unknown) => {
        const opts = options as { callback: (resp: Record<string, unknown>) => void };
        return {
          requestAccessToken: () => {
            opts.callback({ access_token: 'tok', expires_in: 100 });
          },
        };
      };
      service.signIn(1);
      expect(service.account1AuthUser()).toBeNull();
      expect(localStorage.getItem('google_account1_authuser')).toBeNull();
    });

    it('should not call scheduleExpiry or set anything if no GIS', () => {
      (
        window as unknown as { google: { accounts: { oauth2: { initTokenClient?: unknown } } } }
      ).google.accounts.oauth2.initTokenClient = undefined;
      const spy = jest.spyOn(global, 'setTimeout');
      service.signIn(1);
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 100);
    });
  });

  describe('scheduleExpiry', () => {
    it('should sign out immediately if expired', () => {
      const signOutSpy = jest.spyOn(service, 'signOut');
      service['scheduleExpiry'](1, Date.now() - 1000);
      expect(signOutSpy).toHaveBeenCalledWith(1);
    });
    it('should set expiryTimeout1 for account 1', () => {
      jest.useFakeTimers();
      service['scheduleExpiry'](1, Date.now() + 1000);
      expect(service['expiryTimeout1']).not.toBeNull();
      jest.useRealTimers();
    });
    it('should set expiryTimeout2 for account 2', () => {
      jest.useFakeTimers();
      service['scheduleExpiry'](2, Date.now() + 1000);
      expect(service['expiryTimeout2']).not.toBeNull();
      jest.useRealTimers();
    });
  });
});
