import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input } from '@angular/core';
import { DuelsDeckStat } from '../../../models/duels/duels-player-stats';
import { DuelsState } from '../../../models/duels/duels-state';
import { NavigationDuels } from '../../../models/mainwindow/navigation/navigation-duels';
import { MainWindowStoreEvent } from '../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../services/overwolf.service';
import { OwUtilsService } from '../../../services/plugins/ow-utils.service';

@Component({
	selector: 'duels-deck-details',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/component/duels/desktop/duels-deck-details.component.scss`,
	],
	template: `
		<div class="duels-deck-details">
			<div class="deck-list-container starting">
				<copy-deckstring
					class="copy-deckcode"
					[deckstring]="deck?.decklist"
					[showTooltip]="true"
					title="Starting deck"
				>
				</copy-deckstring>
				<deck-list class="deck-list" [deckstring]="deck?.decklist"></deck-list>
			</div>
			<div class="treasures"></div>
			<div class="deck-list-container final">
				<copy-deckstring
					class="copy-deckcode"
					[deckstring]="deck?.finalDecklist"
					[showTooltip]="true"
					title="Final deck"
				>
				</copy-deckstring>
				<deck-list class="deck-list" [deckstring]="deck?.finalDecklist"></deck-list>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelsDeckDetailsComponent implements AfterViewInit {
	@Input() set state(value: DuelsState) {
		this._state = value;
		this.updateValues();
	}

	@Input() set navigation(value: NavigationDuels) {
		this._navigation = value;
		this.updateValues();
	}

	deck: DuelsDeckStat;

	private _state: DuelsState;
	private _navigation: NavigationDuels;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(private readonly ow: OverwolfService, private readonly owUtils: OwUtilsService) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	private updateValues() {
		if (!this._state?.playerStats?.deckStats || !this._navigation) {
			return;
		}

		this.deck = this._state.playerStats.deckStats
			.map(grouped => grouped.decks)
			.reduce((a, b) => a.concat(b), [])
			.find(deck => deck.id === this._navigation.selectedDeckId);
		if (!this.deck) {
			return;
		}

		// console.log('ready to set treasures', this.deck.treasuresCardIds, this.deck);
		// this.treasures = this.deck.treasuresCardIds.map(cardId => ({
		// 	cardId: cardId,
		// 	icon: `https://static.zerotoheroes.com/hearthstone/cardart/256x/${cardId}.jpg`,
		// }));
	}
}