import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { EnemyList } from './pages/enemy-list/enemy-list';
import { LineupSimulator } from './pages/lineup-simulator/lineup-simulator';
import { SeasonDetails } from './pages/season-details/season-details';
import { YourCharacters } from './pages/your-characters/your-characters';
import { CharacterListEditor } from './pages/admin/character-list-editor/character-list-editor';
import { EnemiesEditor } from './pages/admin/enemies-editor/enemies-editor';
import { ActAndModesEditor } from './pages/admin/modes-editor/act-and-modes-editor.component';
import { SeasonsEditor } from './pages/admin/seasons-editor/seasons-editor';


// app.routes.ts
export const routes: Routes = [
  { path: '', component: LineupSimulator },
  { path: 'season', component: SeasonDetails },
  { path: 'characters', component: YourCharacters },
  { path: 'enemies', component: EnemyList },

  {
    path: 'admin',
    canActivate: [adminGuard],
    component: AdminDashboard,
    children: [
      { path: '', redirectTo: 'characters', pathMatch: 'full' },

      { path: 'characters', component: CharacterListEditor },
      { path: 'enemies', component: EnemiesEditor },
      { path: 'modes', component: ActAndModesEditor },
      { path: 'seasons', component: SeasonsEditor },
    ]
  }
];
