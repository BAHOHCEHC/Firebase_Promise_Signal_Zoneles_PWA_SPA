import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { EnemyList } from './pages/enemy-list/enemy-list';
import { LineupSimulator } from './pages/lineup-simulator/lineup-simulator';
import { YourCharacters } from './pages/your-characters/your-characters';
import { CharacterListEditor } from './pages/admin/character-list-editor/character-list-editor';
import { ActAndModesEditor } from './pages/admin/modes-editor/act-and-modes-editor';
import { EnemyEditor } from './pages/admin/enemy-editor/enemy-editor';
import { SeasonsEditorComponent } from './pages/admin/seasons-editor/seasons-editor';
import { SeasonsDetails } from './pages/season-details/season-details';
import { TaskTrackerAdmin } from './pages/admin/task-tracker-admin/task-tracker-admin';
import { TaskTracker } from './pages/task-tracker/task-tracker';

// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lineup-simulator/lineup-simulator').then((c) => c.LineupSimulator),
  },
  {
    path: 'season',
    loadComponent: () =>
      import('./pages/season-details/season-details').then((c) => c.SeasonsDetails),
  },
  {
    path: 'characters',
    loadComponent: () =>
      import('./pages/your-characters/your-characters').then((c) => c.YourCharacters),
  },
  {
    path: 'enemies',
    loadComponent: () => import('./pages/enemy-list/enemy-list').then((c) => c.EnemyList),
  },
  {
    path: 'task-tracker',
    loadComponent: () => import('./pages/task-tracker/task-tracker').then((c) => c.TaskTracker),
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((c) => c.AdminDashboard),
    children: [
      {
        path: '',
        redirectTo: 'characters',
        pathMatch: 'full',
      },
      {
        path: 'characters',
        loadComponent: () =>
          import('./pages/admin/character-list-editor/character-list-editor').then(
            (c) => c.CharacterListEditor,
          ),
      },
      {
        path: 'enemies',
        loadComponent: () =>
          import('./pages/admin/enemy-editor/enemy-editor').then((c) => c.EnemyEditor),
      },
      {
        path: 'modes',
        loadComponent: () =>
          import('./pages/admin/modes-editor/act-and-modes-editor').then(
            (c) => c.ActAndModesEditor,
          ),
      },
      {
        path: 'seasons',
        loadComponent: () =>
          import('./pages/admin/seasons-editor/seasons-editor').then(
            (c) => c.SeasonsEditorComponent,
          ),
      },
      {
        path: 'ttracker',
        loadComponent: () =>
          import('./pages/admin/task-tracker-admin/task-tracker-admin').then(
            (c) => c.TaskTrackerAdmin,
          ),
      },
    ],
  },
];
