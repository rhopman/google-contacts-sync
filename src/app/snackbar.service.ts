import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly snackBar = inject(MatSnackBar);

  show(message = '', action = 'Dismiss', duration = 4000) {
    this.snackBar.open(message, action, { duration });
  }
}
