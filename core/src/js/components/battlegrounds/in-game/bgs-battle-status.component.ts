import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Optional, ViewRef } from '@angular/core';
import { SimulationResult } from '@firestone-hs/simulate-bgs-battle/dist/simulation-result';
import { GameSample } from '@firestone-hs/simulate-bgs-battle/dist/simulation/spectator/game-sample';
import { BgsBattleSimulationService } from '../../../services/battlegrounds/bgs-battle-simulation.service';
import { OverwolfService } from '../../../services/overwolf.service';

declare let amplitude: any;

@Component({
	selector: 'bgs-battle-status',
	styleUrls: [
		`../../../../css/global/reset-styles.scss`,
		`../../../../css/component/battlegrounds/in-game/bgs-battle-status.component.scss`,
	],
	template: `
		<div class="battle-simulation">
			<div class="probas">
				<div class="title">Your chance of:</div>
				<div class="proba-items">
					<div class="win item">
						<div
							class="label"
							helpTooltip="Your chances of winning the current battle (assumes all hero powers are active)"
						>
							Win
						</div>
						<div class="value-container">
							<div class="value">{{ battleSimulationResultWin || '--' }}</div>
							<div
								class="replay-icon"
								*ngIf="hasSimulationResult('win') && showReplayLink"
								(click)="viewSimulationResult('win')"
								helpTooltip="Open a simulation sample leading to this result in your browser"
							>
								<svg class="svg-icon-fill" *ngIf="!processingSimulationSample">
									<use xlink:href="/Files/assets/svg/sprite.svg#video" />
								</svg>
								<svg class="svg-icon-fill" class="loading-icon" *ngIf="processingSimulationSample">
									<use xlink:href="/Files/assets/svg/sprite.svg#loading_spiral" />
								</svg>
							</div>
						</div>
					</div>
					<div class="tie item">
						<div
							class="label"
							helpTooltip="Your chances of tying the current battle (assumes all hero powers are active)"
						>
							Tie
						</div>
						<div class="value-container">
							<div class="value">{{ battleSimulationResultTie || '--' }}</div>
							<div
								class="replay-icon"
								*ngIf="hasSimulationResult('tie') && showReplayLink"
								(click)="viewSimulationResult('tie')"
								helpTooltip="Open a simulation sample leading to this result in your browser"
							>
								<svg class="svg-icon-fill" *ngIf="!processingSimulationSample">
									<use xlink:href="/Files/assets/svg/sprite.svg#video" />
								</svg>
								<svg class="svg-icon-fill" class="loading-icon" *ngIf="processingSimulationSample">
									<use xlink:href="/Files/assets/svg/sprite.svg#loading_spiral" />
								</svg>
							</div>
						</div>
					</div>
					<div class="lose item">
						<div
							class="label"
							helpTooltip="Your chances of losing the current battle (assumes all hero powers are active)"
						>
							Loss
						</div>
						<div class="value-container">
							<div class="value">{{ battleSimulationResultLose || '--' }}</div>
							<div
								class="replay-icon"
								*ngIf="hasSimulationResult('loss') && showReplayLink"
								(click)="viewSimulationResult('loss')"
								helpTooltip="Open a simulation sample leading to this result in your browser"
							>
								<svg class="svg-icon-fill" *ngIf="!processingSimulationSample">
									<use xlink:href="/Files/assets/svg/sprite.svg#video" />
								</svg>
								<svg class="svg-icon-fill" class="loading-icon" *ngIf="processingSimulationSample">
									<use xlink:href="/Files/assets/svg/sprite.svg#loading_spiral" />
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="damage-container">
				<div class="title">Dmg</div>
				<div class="damage dealt" helpTooltip="Average damage dealt">
					<div class="damage-icon">
						<svg class="svg-icon-fill">
							<use xlink:href="/Files/assets/svg/sprite.svg#sword" />
						</svg>
					</div>
					<div class="damage-value">{{ damageWon || '--' }}</div>
				</div>
				<div class="damage received" helpTooltip="Average damage received">
					<div class="damage-icon">
						<svg class="svg-icon-fill">
							<use xlink:href="/Files/assets/svg/sprite.svg#sword" />
						</svg>
					</div>
					<div class="damage-value">{{ damageLost || '--' }}</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsBattleStatusComponent {
	battleSimulationResultWin: string;
	battleSimulationResultTie: string;
	battleSimulationResultLose: string;
	winSimulationSample: readonly GameSample[];
	tieSimulationSample: readonly GameSample[];
	loseSimulationSample: readonly GameSample[];
	temporaryBattleTooltip: string;
	damageWon: string;
	damageLost: string;
	@Input() showReplayLink: boolean;

	processingSimulationSample: boolean;

	private _previousStatus: string;
	private _previousBattle;
	private tempInterval;

	@Input() set battleSimulationStatus(value: 'empty' | 'waiting-for-result' | 'done') {
		// console.log('setting battle sim status', value, this._previousStatus);
		if (value === this._previousStatus) {
			return;
		}
		this._previousStatus = value;
		if (this.tempInterval) {
			clearInterval(this.tempInterval);
		}
		if (!value || value === 'empty') {
			// console.log('result empty', value);
			this.temporaryBattleTooltip = "Battle simulation will start once we see the opponent's board";
			this.battleSimulationResultWin = '--';
			this.battleSimulationResultTie = '--';
			this.battleSimulationResultLose = '--';
			this.winSimulationSample = [];
			this.tieSimulationSample = [];
			this.loseSimulationSample = [];
			this.damageWon = null;
			this.damageLost = null;
		} else if (value === 'waiting-for-result') {
			// console.log('result waiting', value);
			this.temporaryBattleTooltip = 'Battle simulation is running, results will arrive soon';
			this.tempInterval = setInterval(() => {
				this.battleSimulationResultWin = (99 * Math.random()).toFixed(1) + '%';
				this.battleSimulationResultTie = (99 * Math.random()).toFixed(1) + '%';
				this.battleSimulationResultLose = (99 * Math.random()).toFixed(1) + '%';
				if (!(this.cdr as ViewRef)?.destroyed) {
					this.cdr.detectChanges();
				}
			}, 30);
		} else {
			// console.log('result done', value);
			this.temporaryBattleTooltip =
				'Please be aware that the simulation assumes that the opponent uses their hero power, if it is an active hero power';
		}
	}

	@Input() set nextBattle(value: SimulationResult) {
		if (value === this._previousBattle) {
			// console.log('not setting next battle', value, this._previousBattle);
			return;
		}
		this._previousBattle = value;
		console.log('setting next battle', value);
		if (value?.wonPercent != null) {
			this.battleSimulationResultWin = value.wonPercent.toFixed(1) + '%';
			this.battleSimulationResultTie = value.tiedPercent.toFixed(1) + '%';
			this.battleSimulationResultLose = value.lostPercent.toFixed(1) + '%';
			this.winSimulationSample = value.outcomeSamples.won;
			this.tieSimulationSample = value.outcomeSamples.tied;
			this.loseSimulationSample = value.outcomeSamples.lost;
			this.damageWon = value.averageDamageWon?.toFixed(1);
			this.damageLost = value.averageDamageLost?.toFixed(1);
		} else {
			console.log('no value in nextbattle', value);
		}
	}

	constructor(
		private readonly cdr: ChangeDetectorRef,
		@Optional() private readonly ow: OverwolfService,
		private readonly bgsSim: BgsBattleSimulationService,
	) {}

	ngAfterViewInit() {
		// console.log('after battle status init');
	}

	async viewSimulationResult(category: 'win' | 'tie' | 'loss') {
		console.log('viewing simulation result', category);
		const simulationSample: GameSample = this.pickSimulationResult(category);
		console.log('sim sample', simulationSample);
		if (!simulationSample) {
			return;
		}
		this.processingSimulationSample = true;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}

		// const id = 5;
		const id = await this.bgsSim.getIdForSimulationSample(simulationSample);
		if (id) {
			amplitude.getInstance().logEvent('bgsSimulation', {
				'bgsSimulationId': id,
			});
			if (this.ow) {
				this.ow.openUrlInDefaultBrowser(`http://replays.firestoneapp.com/?bgsSimulationId=${id}`);
			} else {
				window.open(`http://replays.firestoneapp.com/?bgsSimulationId=${id}`, '_blank');
			}
		}
		this.processingSimulationSample = false;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	hasSimulationResult(category: 'win' | 'tie' | 'loss') {
		// return true;
		switch (category) {
			case 'win':
				return this.winSimulationSample && this.winSimulationSample.length > 0;
			case 'tie':
				return this.tieSimulationSample && this.tieSimulationSample.length > 0;
			case 'loss':
				return this.loseSimulationSample && this.loseSimulationSample.length > 0;
		}
	}

	private pickSimulationResult(category: 'win' | 'tie' | 'loss') {
		switch (category) {
			case 'win':
				return this.winSimulationSample && this.winSimulationSample.length > 0
					? this.winSimulationSample[0]
					: null;
			case 'tie':
				return this.tieSimulationSample && this.tieSimulationSample.length > 0
					? this.tieSimulationSample[0]
					: null;
			case 'loss':
				return this.loseSimulationSample && this.loseSimulationSample.length > 0
					? this.loseSimulationSample[0]
					: null;
		}
	}
}
