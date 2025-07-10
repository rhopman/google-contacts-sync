import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mocked } from 'jest-mock';
import { GoogleAuthService } from '../google/google-auth.service';
import { AccountManagementService } from './account-management.service';

describe('AccountManagementService', () => {
  let service: AccountManagementService;
  let googleAuthSpy: Mocked<GoogleAuthService>;

  beforeEach(() => {
    googleAuthSpy = {
      signIn: jest.fn(),
      signOut: jest.fn(),
      account1: null,
      account2: null,
      account1AuthUser: null,
      account2AuthUser: null,
    } as unknown as Mocked<GoogleAuthService>;
    TestBed.configureTestingModule({
      providers: [
        AccountManagementService,
        { provide: GoogleAuthService, useValue: googleAuthSpy },
      ],
    });
    service = TestBed.inject(AccountManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call signIn on connectAccount', () => {
    service.connectAccount(1);
    expect(googleAuthSpy.signIn).toHaveBeenCalledWith(1);
  });

  it('should call signOut on disconnectAccount', () => {
    service.disconnectAccount(1);
    expect(googleAuthSpy.signOut).toHaveBeenCalledWith(1);
  });
});
