import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { EnemyList } from './pages/enemy-list/enemy-list';
import { LineupSimulator } from './pages/lineup-simulator/lineup-simulator';
import { YourCharacters } from './pages/your-characters/your-characters';
import { CharacterListEditor } from './pages/admin/character-list-editor/character-list-editor';
import { ActAndModesEditor } from './pages/admin/modes-editor/act-and-modes-editor.component';
import { EnemyEditor } from './pages/admin/enemy-editor/enemy-editor';
import { SeasonsEditorComponent } from './pages/admin/seasons-editor/seasons-editor';
import { SeasonsDetails } from './pages/season-details/season-details';


// app.routes.ts
export const routes: Routes = [
  { path: '', component: LineupSimulator },
  { path: 'season', component: SeasonsDetails },
  { path: 'characters', component: YourCharacters },
  { path: 'enemies', component: EnemyList },

  {
    path: 'admin',
    canActivate: [adminGuard],
    component: AdminDashboard,
    children: [
      { path: '', redirectTo: 'characters', pathMatch: 'full' },

      { path: 'characters', component: CharacterListEditor },
      { path: 'enemies', component: EnemyEditor },
      { path: 'modes', component: ActAndModesEditor },
      { path: 'seasons', component: SeasonsEditorComponent },
    ]
  }
];
