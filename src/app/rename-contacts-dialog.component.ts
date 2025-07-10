import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-rename-contacts-dialog',
  templateUrl: './rename-contacts-dialog.component.html',
  styleUrl: './rename-contacts-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgIf,
  ],
})
export class RenameContactsDialogComponent {
  protected readonly newName = signal('');
  protected readonly error = signal('');

  private readonly dialogRef = inject(MatDialogRef<RenameContactsDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as { name?: string } | null;

  constructor() {
    if (this.data?.name) {
      this.newName.set(this.data.name);
    }
  }

  setInitialName(name: string) {
    this.newName.set(name);
  }

  confirm() {
    const name = this.newName();
    if (!name.trim()) {
      this.error.set('Name cannot be empty.');
      return;
    }
    this.dialogRef.close(name.trim());
  }

  cancel() {
    this.dialogRef.close();
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.newName.set(value);
    this.error.set('');
  }
}
