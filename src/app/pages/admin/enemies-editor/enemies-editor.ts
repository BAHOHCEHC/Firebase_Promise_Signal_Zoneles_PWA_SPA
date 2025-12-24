import { Component } from '@angular/core';
import { multiFactor } from 'firebase/auth';

@Component({
  standalone: true,
  selector: 'app-enemies-editor',
  imports: [],
  templateUrl: './enemies-editor.html',
  styleUrl: './enemies-editor.scss',
})
export class EnemiesEditor {
  openEnemiesUniversalModal(entity: string): void {
    console.log('realization');
  }
}
