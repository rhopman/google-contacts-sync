import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-create-contact-placeholder',
  templateUrl: './create-contact-placeholder.component.html',
  styleUrls: [
    './create-contact-placeholder.component.scss',
  ],
  imports: [
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateContactPlaceholderComponent {
  side = input<string>();
  disabled = input<boolean>();
  isCreating = input<boolean>();
  name = input<string>();
  create = output<void>();
}
