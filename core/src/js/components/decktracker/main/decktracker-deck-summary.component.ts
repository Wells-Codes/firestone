import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input } from '@angular/core';
import { DeckSummary } from '../../../models/mainwindow/decktracker/deck-summary';
import { StatGameFormatType } from '../../../models/mainwindow/stats/stat-game-format.type';
import { HideDeckSummaryEvent } from '../../../services/mainwindow/store/events/decktracker/hide-deck-summary-event';
import { RestoreDeckSummaryEvent } from '../../../services/mainwindow/store/events/decktracker/restore-deck-summary-event';
import { SelectDeckDetailsEvent } from '../../../services/mainwindow/store/events/decktracker/select-deck-details-event';
import { MainWindowStoreEvent } from '../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../services/overwolf.service';
import { capitalizeEachWord } from '../../../services/utils';

@Component({
	selector: 'decktracker-deck-summary',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/component/controls/controls.scss`,
		`../../../../css/component/controls/control-close.component.scss`,
		`../../../../css/global/menu.scss`,
		`../../../../css/component/decktracker/main/decktracker-deck-summary.component.scss`,
	],
	template: `
		<div class="decktracker-deck-summary" [ngClass]="{ 'hidden': hidden }" (click)="selectDeck($event)">
			<div class="deck-name" [helpTooltip]="deckNameTooltip">{{ deckName }}</div>
			<div class="deck-image">
				<img class="skin" [src]="skin" />
				<img class="frame" src="assets/images/deck/hero_frame.png" />
				<img class="decoration {{ format }}" *ngIf="decoration" [src]="decoration" />
			</div>
			<div class="stats">
				<div class="text total-games">{{ totalGames }} games</div>
				<div class="text win-rate">{{ winRatePercentage }}% win rate</div>
				<div class="last-used">Last used: {{ lastUsed }}</div>
			</div>
			<button
				class="close-button"
				helpTooltip="Archive deck (you can restore it later)"
				(mousedown)="hideDeck($event)"
				*ngIf="!hidden"
			>
				<svg class="svg-icon-fill">
					<use xmlns:xlink="https://www.w3.org/1999/xlink" xlink:href="assets/svg/sprite.svg#bin"></use>
				</svg>
			</button>
			<button class="restore-button" helpTooltip="Restore deck" (mousedown)="restoreDeck($event)" *ngIf="hidden">
				<svg class="svg-icon-fill">
					<use xmlns:xlink="https://www.w3.org/1999/xlink" xlink:href="assets/svg/sprite.svg#restore"></use>
				</svg>
			</button>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecktrackerDeckSummaryComponent implements AfterViewInit {
	@Input() set deck(value: DeckSummary) {
		// console.log('[decktracker-deck-summary] setting value', value);
		this._deck = value;
		this.deckName = value.deckName || 'Deck name';
		this.format = value.format;
		this.deckNameTooltip = `${this.deckName} (${capitalizeEachWord(this.format)})`;
		this.totalGames = value.totalGames;
		this.winRatePercentage = parseFloat('' + value.winRatePercentage).toLocaleString('en-US', {
			minimumIntegerDigits: 1,
			maximumFractionDigits: 2,
		});
		this.lastUsed = this.buildLastUsedDate(value.lastUsedTimestamp);
		this.skin = `https://static.zerotoheroes.com/hearthstone/cardart/256x/${value.skin}.jpg`;
		this.hidden = value.hidden;
		this.decoration = this.buildDecoration(value.format);
	}

	_deck: DeckSummary;
	deckName: string;
	deckNameTooltip: string;
	deckNameClass: string;
	totalGames: number;
	winRatePercentage: string;
	lastUsed: string;
	skin: string;
	hidden: boolean;
	decoration: string;
	format: StatGameFormatType;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(private readonly ow: OverwolfService, private readonly elementRef: ElementRef) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	hideDeck(event: MouseEvent) {
		this.stateUpdater.next(new HideDeckSummaryEvent(this._deck.deckstring));
		event.stopPropagation();
		event.preventDefault();
	}

	restoreDeck(event: MouseEvent) {
		this.stateUpdater.next(new RestoreDeckSummaryEvent(this._deck.deckstring));
		event.stopPropagation();
		event.preventDefault();
	}

	selectDeck(event: MouseEvent) {
		event.stopPropagation();
		event.preventDefault();
		if ((event.target as any)?.tagName === 'BUTTON') {
			return;
		}
		this.stateUpdater.next(new SelectDeckDetailsEvent(this._deck.deckstring));
	}

	private buildLastUsedDate(lastUsedTimestamp: number): string {
		const date = new Date(lastUsedTimestamp);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: '2-digit',
			year: 'numeric',
		});
	}

	private buildDecoration(gameFormat: StatGameFormatType) {
		switch (gameFormat) {
			case 'classic':
				return `https://static.zerotoheroes.com/hearthstone/asset/firestone/images/deck/ranks/ranked/Medal_Classic.png`;
			case 'wild':
				return `https://static.zerotoheroes.com/hearthstone/asset/firestone/images/deck/ranks/ranked/Medal_Wild.png`;
			default:
				return null;
		}
	}
}
