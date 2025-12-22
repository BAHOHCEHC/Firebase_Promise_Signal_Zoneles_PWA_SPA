import { Component } from '@angular/core';
import { actModesStore } from '../../../../../store/act-modes.store';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modes-table.component.html',
})
export class ModesTableComponent {
  store = actModesStore;
}
