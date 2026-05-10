// features/leaderboard/leaderboard.component.ts
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RankingService } from '../../services/ranking.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent implements OnInit {
  private rankingService = inject(RankingService);
  private router = inject(Router);
  leaderboard$ = this.rankingService.leaderboard$;

  ngOnInit() {
    this.rankingService.loadInitial();
  }

  onBack() {
    this.router.navigate(['/room-menu']);
  }
}
