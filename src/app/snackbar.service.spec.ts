import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
  let service: SnackbarService;
  let snackBar: jest.Mocked<MatSnackBar>;

  beforeEach(() => {
    const snackBarSpy = { open: jest.fn() } as unknown as MatSnackBar;
    TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
      ],
      providers: [
        SnackbarService,
      ],
    });
    TestBed.overrideProvider(MatSnackBar, { useValue: snackBarSpy });
    service = TestBed.inject(SnackbarService);
    snackBar = TestBed.inject(MatSnackBar) as jest.Mocked<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call MatSnackBar.open with default values', () => {
    service.show('Test message');
    expect(snackBar.open).toHaveBeenCalledWith('Test message', 'Dismiss', { duration: 4000 });
  });

  it('should call MatSnackBar.open with custom values', () => {
    service.show('Custom', 'Close', 1000);
    expect(snackBar.open).toHaveBeenCalledWith('Custom', 'Close', { duration: 1000 });
  });
});
