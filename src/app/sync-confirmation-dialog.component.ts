import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ContactPerson } from './google/google-people-contacts.service';

export interface SyncDialogData {
  direction: 'left-to-right' | 'right-to-left';
  sourceContact: ContactPerson;
  targetContact: ContactPerson;
  sourceAccountName: string;
  targetAccountName: string;
}

@Component({
  selector: 'app-sync-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>Sync Contact</h2>
    <mat-dialog-content>
      <p>
        <strong>{{ getActionDescription() }}</strong>
      </p>
      <p>
        This will update <strong>{{ data.targetContact.names?.[0]?.displayName }}</strong> in
        <strong>{{ data.targetAccountName }}</strong> with the information from
        <strong>{{ data.sourceAccountName }}</strong
        >.
      </p>

      <div class="sync-preview">
        <h4>Changes that will be made:</h4>

        @if (getEmailChanges().length > 0) {
          <div class="change-section">
            <strong>Email addresses:</strong>
            @for (change of getEmailChanges(); track $index) {
              <div class="change-item">{{ change }}</div>
            }
          </div>
        }

        @if (getPhoneChanges().length > 0) {
          <div class="change-section">
            <strong>Phone numbers:</strong>
            @for (change of getPhoneChanges(); track $index) {
              <div class="change-item">{{ change }}</div>
            }
          </div>
        }

        @if (getAddressChanges().length > 0) {
          <div class="change-section">
            <strong>Addresses:</strong>
            @for (change of getAddressChanges(); track $index) {
              <div class="change-item">{{ change }}</div>
            }
          </div>
        }

        @if (getNoteChanges().length > 0) {
          <div class="change-section">
            <strong>Notes:</strong>
            @for (change of getNoteChanges(); track $index) {
              <div class="change-item">{{ change }}</div>
            }
          </div>
        }

        @if (getBirthdayChanges().length > 0) {
          <div class="change-section">
            <strong>Birthdays:</strong>
            @for (change of getBirthdayChanges(); track $index) {
              <div class="change-item">{{ change }}</div>
            }
          </div>
        }

        @if (
          getEmailChanges().length === 0 &&
          getPhoneChanges().length === 0 &&
          getAddressChanges().length === 0 &&
          getBirthdayChanges().length === 0 &&
          getNoteChanges().length === 0
        ) {
          <div class="no-changes">No field changes detected (name will remain the same).</div>
        }
      </div>

      <p class="warning-text">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onConfirm()">Sync Contact</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .sync-preview {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        margin: 1rem 0;
      }

      .change-section {
        margin-bottom: 0.75rem;
      }

      .change-item {
        margin-left: 1rem;
        font-family: monospace;
        font-size: 0.9rem;
        color: #666;
      }

      .no-changes {
        color: #666;
        font-style: italic;
      }

      .warning-text {
        color: #f44336;
        font-size: 0.9rem;
        margin-top: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
  ],
})
export class SyncConfirmationDialog {
  protected readonly data = inject<SyncDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SyncConfirmationDialog>);

  protected getActionDescription(): string {
    if (this.data.direction === 'left-to-right') {
      return `Sync contact from ${this.data.sourceAccountName} → ${this.data.targetAccountName}`;
    } else {
      return `Sync contact from ${this.data.sourceAccountName} → ${this.data.targetAccountName}`;
    }
  }

  protected getEmailChanges(): string[] {
    const sourceEmails = this.data.sourceContact.emailAddresses?.map((e) => e.value) || [];
    const targetEmails = this.data.targetContact.emailAddresses?.map((e) => e.value) || [];

    if (sourceEmails.join(',') === targetEmails.join(',')) {
      return [];
    }

    return [
      `From: ${targetEmails.join(', ') || '(none)'}`,
      `To: ${sourceEmails.join(', ') || '(none)'}`,
    ];
  }

  protected getPhoneChanges(): string[] {
    const sourcePhones = this.data.sourceContact.phoneNumbers?.map((p) => p.value) || [];
    const targetPhones = this.data.targetContact.phoneNumbers?.map((p) => p.value) || [];

    if (sourcePhones.join(',') === targetPhones.join(',')) {
      return [];
    }

    return [
      `From: ${targetPhones.join(', ') || '(none)'}`,
      `To: ${sourcePhones.join(', ') || '(none)'}`,
    ];
  }

  protected getAddressChanges(): string[] {
    const sourceAddresses = this.data.sourceContact.addresses?.map((a) => a.formattedValue) || [];
    const targetAddresses = this.data.targetContact.addresses?.map((a) => a.formattedValue) || [];

    if (sourceAddresses.join(',') === targetAddresses.join(',')) {
      return [];
    }

    return [
      `From: ${targetAddresses.join(', ') || '(none)'}`,
      `To: ${sourceAddresses.join(', ') || '(none)'}`,
    ];
  }

  protected getNoteChanges(): string[] {
    const sourceNotes = this.data.sourceContact.biographies?.map((b) => b.value) || [];
    const targetNotes = this.data.targetContact.biographies?.map((b) => b.value) || [];
    if (sourceNotes.join('\n') === targetNotes.join('\n')) {
      return [];
    }
    return [
      `From: ${targetNotes.join(' | ') || '(none)'}`,
      `To: ${sourceNotes.join(' | ') || '(none)'}`,
    ];
  }

  protected getBirthdayChanges(): string[] {
    const format = (bday?: { date?: { year?: number; month?: number; day?: number } }) => {
      if (!bday?.date) return '';
      const { year, month, day } = bday.date;
      if (year) {
        return `${year}-${month?.toString().padStart(2, '0') ?? '??'}-${day?.toString().padStart(2, '0') ?? '??'}`;
      }
      if (month && day) {
        return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
      return '';
    };
    const sourceBirthdays = new Set(
      (this.data.sourceContact.birthdays ?? []).map(format).filter(Boolean),
    );
    const targetBirthdays = new Set(
      (this.data.targetContact.birthdays ?? []).map(format).filter(Boolean),
    );

    const removed = [
      ...targetBirthdays,
    ].filter((b) => !sourceBirthdays.has(b));
    const added = [
      ...sourceBirthdays,
    ].filter((b) => !targetBirthdays.has(b));

    if (removed.length === 0 && added.length === 0) {
      return [];
    }
    const changes: string[] = [];
    if (removed.length > 0) {
      changes.push(`Removed: ${removed.join(' | ')}`);
    }
    if (added.length > 0) {
      changes.push(`Added: ${added.join(' | ')}`);
    }
    return changes;
  }

  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  protected onConfirm(): void {
    this.dialogRef.close(true);
  }
}
