// features/leaderboard/leaderboard.component.ts
import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  leaderboard$ = this.rankingService.leaderboard$;

  ngOnInit() {
    this.rankingService.loadInitial();
  }
}
