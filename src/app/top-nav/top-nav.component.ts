import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { DomSanitizer } from '@angular/platform-browser';
import { repositoryUrl } from '../environment';

const THEME_KEY = 'theme-mode';

type ThemeMode = 'auto' | 'light' | 'dark';

@Component({
  selector: 'app-top-nav',
  templateUrl: './top-nav.component.html',
  styleUrls: [
    './top-nav.component.scss',
  ],
  imports: [
    MatIconModule,
    MatToolbarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopNavComponent {
  private readonly _theme = signal<ThemeMode>(this.getInitialTheme());
  protected readonly repositoryUrl = signal(repositoryUrl);
  readonly theme = computed(() => this._theme());

  readonly themeIcon = computed(() => {
    switch (this._theme()) {
      case 'light':
        return 'light_mode';
      case 'dark':
        return 'dark_mode';
      default:
        return 'brightness_auto';
    }
  });

  readonly themeLabel = computed(() => {
    switch (this._theme()) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      default:
        return 'Automatic (system)';
    }
  });

  private systemDarkQuery: MediaQueryList | null = null;
  private systemListener = () => {
    if (this._theme() === 'auto') {
      this.applyTheme('auto');
    }
  };

  private getInitialTheme(): ThemeMode {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return saved || 'auto';
  }

  private getSystemTheme(): ThemeMode {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  switchTheme() {
    const next: ThemeMode =
      this._theme() === 'auto' ? 'light' : this._theme() === 'light' ? 'dark' : 'auto';
    this._theme.set(next);
    localStorage.setItem(THEME_KEY, next);
    this.applyTheme(next);
  }

  private applyTheme(mode: ThemeMode) {
    const root = document.documentElement;

    if (mode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('light', 'dark');
    }
  }

  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    this.applyTheme(this._theme());
    this.iconRegistry.addSvgIcon(
      'github',
      this.sanitizer.bypassSecurityTrustResourceUrl('github.svg'),
    );
  }
}
