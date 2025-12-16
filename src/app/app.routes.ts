import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { EnemyList } from './pages/enemy-list/enemy-list';
import { LineupSimulator } from './pages/lineup-simulator/lineup-simulator';
import { SeasonDetails } from './pages/season-details/season-details';
import { YourCharacters } from './pages/your-characters/your-characters';


export const routes: Routes = [
  {
    path: '',
    component: LineupSimulator
  },
  {
    path: 'season',
    component: SeasonDetails
  },
  {
    path: 'characters',
    component: YourCharacters
  },
  {
    path: 'enemies',
    component: EnemyList
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    component: AdminDashboard
  }
];

