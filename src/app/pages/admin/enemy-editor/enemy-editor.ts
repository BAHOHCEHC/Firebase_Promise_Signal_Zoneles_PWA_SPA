import { Component } from '@angular/core';
import { multiFactor } from 'firebase/auth';

@Component({
  standalone: true,
  selector: 'app-enemy-editor',
  imports: [],
  templateUrl: './enemy-editor.html',
  styleUrl: './enemy-editor.scss',
})
export class EnemiesEditor {
  openEnemiesUniversalModal(entity: string): void {
    console.log('realization');
  }
}
