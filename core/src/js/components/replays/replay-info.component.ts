import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { GameStat } from '../../models/mainwindow/stats/game-stat';
import { StatGameModeType } from '../../models/mainwindow/stats/stat-game-mode.type';
import { MainWindowStoreEvent } from '../../services/mainwindow/store/events/main-window-store-event';
import { ShowReplayEvent } from '../../services/mainwindow/store/events/replays/show-replay-event';
import { TriggerShowMatchStatsEvent } from '../../services/mainwindow/store/events/replays/trigger-show-match-stats-event';
import { OverwolfService } from '../../services/overwolf.service';

@Component({
	selector: 'replay-info',
	styleUrls: [`../../../css/global/menu.scss`, `../../../css/component/replays/replay-info.component.scss`],
	template: `
		<div class="replay-info {{ gameMode }}">
			<div class="result-color-code {{ visualResult }}"></div>

			<div class="left-info">
				<div class="group mode">
					<rank-image class="player-rank" [stat]="replayInfo"></rank-image>
				</div>

				<div class="group player-images">
					<img class="player-class player" [src]="playerClassImage" [helpTooltip]="playerClassTooltip" />
					<div class="vs" *ngIf="opponentClassImage">VS</div>
					<img
						class="player-class opponent"
						[src]="opponentClassImage"
						[helpTooltip]="opponentClassTooltip"
						*ngIf="opponentClassImage"
					/>
					<div class="player-name opponent" *ngIf="opponentName">{{ opponentName }}</div>
				</div>

				<div class="group result">
					<div class="result-icon icon" *ngIf="matchResultIconSvg" [innerHTML]="matchResultIconSvg"></div>
					<div class="result">{{ result }}</div>
				</div>

				<div
					class="group mmr"
					[ngClass]="{ 'positive': deltaMmr > 0, 'negative': deltaMmr < 0 }"
					*ngIf="deltaMmr != null"
				>
					<div class="value">{{ deltaMmr }}</div>
					<div class="text">MMR</div>
				</div>

				<div class="group coin" *ngIf="playCoinIconSvg">
					<div
						class="play-coin-icon icon"
						[innerHTML]="playCoinIconSvg"
						[helpTooltip]="playCoinTooltip"
					></div>
				</div>
			</div>

			<div class="right-info">
				<div class="group match-stats" *ngIf="hasMatchStats" (click)="showStats()">
					<div class="watch" *ngIf="showStatsLabel">{{ showStatsLabel }}</div>
					<div class="stats-icon" [helpTooltip]="!showStatsLabel ? 'Show stats' : null">
						<svg class="svg-icon-fill">
							<use xlink:href="assets/svg/replays/replays_icons.svg#match_stats" />
						</svg>
					</div>
				</div>

				<div class="replay" *ngIf="reviewId" (click)="showReplay()">
					<div class="watch" *ngIf="showReplayLabel">{{ showReplayLabel }}</div>
					<div class="watch-icon" [helpTooltip]="!showReplayLabel ? 'Watch replay' : null">
						<svg class="svg-icon-fill">
							<use xlink:href="assets/svg/replays/replays_icons.svg#match_watch" />
						</svg>
					</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplayInfoComponent implements AfterViewInit {
	@Input() showStatsLabel = 'Stats';
	@Input() showReplayLabel = 'Watch';

	replayInfo: GameStat;
	visualResult: string;
	gameMode: StatGameModeType;
	// deckName: string;
	playerClassImage: string;
	playerClassTooltip: string;
	opponentClassImage: string;
	opponentClassTooltip: string;
	opponentName: string;
	matchResultIconSvg: SafeHtml;
	result: string;
	playCoinIconSvg: SafeHtml;
	playCoinTooltip: SafeHtml;
	reviewId: string;
	hasMatchStats: boolean;
	deltaMmr: number;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	@Input() set replay(value: GameStat) {
		// console.log('[deck-replay-info] setting value', value);
		this.replayInfo = value;
		this.gameMode = value.gameMode;
		// this.deckName = value.playerDeckName || value.playerName;
		[this.playerClassImage, this.playerClassTooltip] = this.buildPlayerClassImage(value, true);
		[this.opponentClassImage, this.opponentClassTooltip] = this.buildPlayerClassImage(value, false);
		this.matchResultIconSvg = this.buildMatchResultIconSvg(value);
		this.result = this.buildMatchResultText(value);
		[this.playCoinIconSvg, this.playCoinTooltip] = this.buildPlayCoinIconSvg(value);
		this.reviewId = value.reviewId;

		const isBg = value.gameMode === 'battlegrounds';
		this.hasMatchStats = isBg;
		this.opponentName = isBg ? null : this.sanitizeName(value.opponentName);
		this.visualResult = isBg ? (parseInt(value.additionalResult) <= 4 ? 'won' : 'lost') : value.result;
		if (isBg) {
			const deltaMmr = parseInt(value.newPlayerRank) - parseInt(value.playerRank);
			if (!isNaN(deltaMmr)) {
				this.deltaMmr = deltaMmr;
			}
		}
	}

	constructor(
		private readonly ow: OverwolfService,
		private readonly sanitizer: DomSanitizer,
		private readonly allCards: AllCardsService,
	) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	showReplay() {
		this.stateUpdater.next(new ShowReplayEvent(this.reviewId));
	}

	showStats() {
		this.stateUpdater.next(new TriggerShowMatchStatsEvent(this.reviewId));
	}

	private buildPlayerClassImage(info: GameStat, isPlayer: boolean): [string, string] {
		if (info.gameMode === 'battlegrounds') {
			if (!isPlayer) {
				return [null, null];
			} else if (info.playerCardId) {
				const card = this.allCards.getCard(info.playerCardId);
				return [`https://static.zerotoheroes.com/hearthstone/cardart/256x/${info.playerCardId}.jpg`, card.name];
			} else {
				// Return Bob to not have an empty image
				return [`https://static.zerotoheroes.com/hearthstone/cardart/256x/TB_BaconShop_HERO_PH.jpg`, null];
			}
		}
		const name = isPlayer
			? this.allCards.getCard(info.playerCardId).name
			: this.allCards.getCard(info.opponentCardId).name;
		const deckName = info.playerDeckName ? ` with ${info.playerDeckName}` : '';
		const tooltip = name + deckName;
		const image = isPlayer
			? `https://static.zerotoheroes.com/hearthstone/cardart/256x/${info.playerCardId}.jpg`
			: `https://static.zerotoheroes.com/hearthstone/cardart/256x/${info.opponentCardId}.jpg`;
		return [image, tooltip];
	}

	private buildMatchResultIconSvg(info: GameStat): SafeHtml {
		if (info.gameMode === 'battlegrounds') {
			return null;
		}
		const iconName = info.result === 'won' ? 'match_result_victory' : 'match_result_defeat';
		return this.sanitizer.bypassSecurityTrustHtml(`
			<svg class="svg-icon-fill">
				<use xlink:href="assets/svg/replays/replays_icons.svg#${iconName}"/>
			</svg>
		`);
	}

	private buildMatchResultText(info: GameStat): string {
		if (info.gameMode === 'battlegrounds' && info.additionalResult) {
			// prettier-ignore
			switch (parseInt(info.additionalResult)) {
				case 1: return '1st';
				case 2: return '2nd';
				case 3: return '3rd';
				case 4: return '4th';
				case 5: return '5th';
				case 6: return '6th';
				case 7: return '7th';
				case 8: return '8th';
			}
		}
		// prettier-ignore
		switch (info.result) {
			case 'won': return 'Victory';
			case 'lost': return 'Defeat';
			case 'tied': return 'Tie';
			default: return 'Unknown';
		}
	}

	private buildPlayCoinIconSvg(info: GameStat): [SafeHtml, string] {
		if (info.gameMode === 'battlegrounds') {
			return [null, null];
		}
		const iconName = info.coinPlay === 'coin' ? 'match_coin' : 'match_play';
		const tooltip = info.coinPlay === 'coin' ? 'Had the Coin' : 'Went first';
		return [
			this.sanitizer.bypassSecurityTrustHtml(`
			<svg class="svg-icon-fill">
				<use xlink:href="assets/svg/replays/replays_icons.svg#${iconName}"/>
			</svg>
		`),
			tooltip,
		];
	}

	private sanitizeName(name: string) {
		if (!name || name.indexOf('#') === -1) {
			return name;
		}
		return name.split('#')[0];
	}
}
