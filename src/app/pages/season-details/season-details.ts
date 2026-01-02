import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonService } from '../../shared/services/season.service';
import { CharacterService } from '../../shared/services/charater.service';
import { EnemiesService } from '../../shared/services/enemies.service';
import { Season_details, Act, Character, ElementType, ElementTypeName, Enemy, Variation_fight, Wave_type, Wave, Enemy_options, Act_options } from '../../../models/models';

@Component({
  selector: 'app-seasons-details',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './season-details.html',
  styleUrl: './season-details.scss'
})
export class SeasonsDetails {

}
