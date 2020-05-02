import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { GameStat } from '../../models/mainwindow/stats/game-stat';

@Component({
	selector: 'rank-image',
	styleUrls: [`../../../css/global/menu.scss`, `../../../css/component/replays/rank-image.component.scss`],
	template: `
		<div class="rank-image" [helpTooltip]="playerRank ? null : 'We had an issue while retrieving the player rank'">
			<div class="icon">
				<img class="art" *ngIf="playerRankArt" [src]="playerRankArt" [helpTooltip]="playerRankImageTooltip" />
				<img
					class="frame"
					*ngIf="playerRankImage"
					[src]="playerRankImage"
					[helpTooltip]="playerRankImageTooltip"
				/>
			</div>
			<div class="rank-text" *ngIf="rankText">{{ rankText }}</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankImageComponent {
	playerRank: string;
	playerRankImage: string;
	playerRankArt: string;
	playerRankImageTooltip: string;
	rankText: string;

	@Input() set stat(value: GameStat) {
		this.playerRank = value.playerRank;
		[this.playerRankImage, this.playerRankArt, this.playerRankImageTooltip] = value.buildPlayerRankImage();
		this.rankText = value.buildRankText();
	}
}
