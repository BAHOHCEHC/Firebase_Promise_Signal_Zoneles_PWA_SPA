import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private router = inject(Router);

  // 🔥 реактивний сигнал URL
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // на основі ролі
  userRole = signal<'admin' | 'user'>('admin');

  tabs = computed(() => {
    if (this.userRole() !== 'admin') return [];
    return [
      { key: 'characters', label: 'Characters list', route: 'characters' },
      { key: 'enemies', label: 'Monsters list', route: 'enemies' },
      { key: 'modes', label: 'Acts & Mods list', route: 'modes' },
      { key: 'seasons', label: 'Season details', route: 'seasons' },
      { key: 'ttracker', label: 'Task tracker', route: 'ttracker' },
    ];
  });

  activeTab = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/characters')) return 'characters';
    if (url.includes('/enemies')) return 'enemies';
    if (url.includes('/modes')) return 'modes';
    if (url.includes('/seasons')) return 'seasons';
    if (url.includes('/ttracker')) return 'ttracker';
    return 'characters';
  });
}
