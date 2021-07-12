import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	Input
} from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { BgsHeroStat } from '@models/battlegrounds/stats/bgs-hero-stat';
import { BattlegroundsFacade } from '@services/battlegrounds/battlegrounds.facade';
import { AppUiStoreService } from '@services/app-ui-store.service';

@Component({
	selector: 'bgs-hero-detailed-stats',
	styleUrls: [
		`../../../../../../css/global/components-global.scss`,
		`../../../../../../css/component/battlegrounds/desktop/categories/hero-details/bgs-hero-detailed-stats.component.scss`,
	],
	template: `
		<div class="bgs-hero-detailed-stats">
			<div class="title">General stats</div>
			<!-- Example using the facade directly in the template -->
			<div class="content" *ngIf="bgsFacade.bgsHeroDetailedStats$ | async as stats">
				<div class="stat">
					<div class="header">Games played</div>
					<div class="values">
						<div class="my-value">{{ stats.playerGamesPlayed }}</div>
					</div>
				</div>
				<div class="stat">
					<div class="header">Avg. position</div>
					<div class="values">
						<div class="my-value">{{ buildValue(stats.playerAveragePosition) }}</div>
						<bgs-global-value [value]="buildValue(stats.averagePosition)"></bgs-global-value>
					</div>
				</div>
				<div class="stat">
					<div class="header">Top 1</div>
					<div class="values">
						<div class="my-value">{{ buildValue(stats.playerTop1, 1) }}%</div>
						<bgs-global-value [value]="buildValue(stats.top1, 1) + '%'"></bgs-global-value>
					</div>
				</div>
				<div class="stat">
					<div class="header">Top 4</div>
					<div class="values">
						<div class="my-value">{{ buildValue(stats.playerTop4, 1) }}</div>
						<bgs-global-value [value]="buildValue(stats.top4, 1) + '%'"></bgs-global-value>
					</div>
				</div>
				<div class="stat">
					<div class="header" helpTooltip="Average MMR gain/loss per match">Avg. net MMR</div>
					<div class="values">
						<div
							class="my-value"
							[ngClass]="{
								'positive': stats.playerAverageMmr > 0,
								'negative': stats.playerAverageMmr < 0
							}"
						>
							{{ buildValue(stats.playerAverageMmr, 0) }}
						</div>
					</div>
				</div>
				<div class="stat">
					<div class="header" helpTooltip="Average MMR gain per match">Avg. MMR gain</div>
					<div class="values">
						<div
							class="my-value"
							[ngClass]="{
								'positive': stats.playerAverageMmrGain > 0,
								'negative': stats.playerAverageMmrGain < 0
							}"
						>
							{{ buildValue(stats.playerAverageMmrGain, 0) }}
						</div>
					</div>
				</div>
				<div class="stat">
					<div class="header" helpTooltip="Average MMR loss per match">Avg. MMR loss</div>
					<div class="values">
						<div
							class="my-value "
							[ngClass]="{
								'positive': stats.playerAverageMmrLoss > 0,
								'negative': stats.playerAverageMmrLoss < 0
							}"
						>
							{{ buildValue(stats.playerAverageMmrLoss, 0) }}
						</div>
					</div>
				</div>
			</div>
		</div>
	`,
})
export class BgsHeroDetailedStatsComponent implements AfterViewInit {
	// _state: BattlegroundsAppState;
	// _heroId: string;
	bgHeroStats$: Observable<BgsHeroStat>;

	// @Input() set state(value: BattlegroundsAppState) {
	// 	if (value === this._state) {
	// 		return;
	// 	}
	// 	this._state = value;
	// 	this.updateValues();
	// }

	// @Input() set heroId(value: string) {
	// 	if (value === this._heroId) {
	// 		return;
	// 	}
	// 	this._heroId = value;
	// 	this.updateValues();
	// }

	constructor(public readonly bgsFacade: BattlegroundsFacade, private readonly store: AppUiStoreService, private readonly cdr: ChangeDetectorRef) { }

	ngAfterViewInit() {
		// Not being used in this component, but just demonstrating that it could work this way
		combineLatest([this.bgsFacade.battlegroundStats$, this.bgsFacade.currentHeroId$]).pipe(
			filter(([stats, heroId]) => !!stats && !!heroId),
			map(([stats, heroId]) => stats.heroStats?.find((stat) => stat.id === heroId)),
		).subscribe(heroStats => console.log('hero stats', heroStats))
	}

	buildValue(value: number, decimals = 2): string {
		if (value === 100) {
			return '100';
		}
		return !value ? '-' : value.toFixed(decimals);
	}
}

@Component({
	selector: 'bgs-global-value',
	styleUrls: [
		`../../../../../../css/global/components-global.scss`,
		`../../../../../../css/component/battlegrounds/desktop/categories/hero-details/bgs-hero-detailed-stats.component.scss`,
	],
	template: `
		<div class="global-value" helpTooltip="Average value for the community">
			<div class="global-icon">
				<svg class="svg-icon-fill">
					<use xlink:href="assets/svg/sprite.svg#global" />
				</svg>
			</div>
			<span class="value">{{ value }}</span>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsGlobalValueComponent {
	@Input() value: string;
}
