import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { DeckSummary } from '../../../models/mainwindow/decktracker/deck-summary';
import { MainWindowStoreEvent } from '../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../services/overwolf.service';

@Component({
	selector: 'decktracker-decks',
	styleUrls: [
		`../../../../css/global/menu.scss`,
		`../../../../css/component/decktracker/main/decktracker-decks.component.scss`,
	],
	template: `
		<div class="decktracker-decks">
			<ul>
				<li *ngFor="let deck of _decks">
					<decktracker-deck-summary [deck]="deck"></decktracker-deck-summary>
				</li>
			</ul>
			<section class="empty-state" *ngIf="!_decks || _decks.length === 0">
				<div class="state-container">
					<i class="i-236X165">
						<svg>
							<use xlink:href="/Files/assets/svg/sprite.svg#empty_state_tracker" />
						</svg>
					</i>
					<span class="title">Something is cooking up</span>
					<span class="subtitle">Play ladder ranked standard match to get started</span>
				</div>
			</section>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecktrackerDecksComponent implements AfterViewInit {
	_decks: readonly DeckSummary[];

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	@Input() set decks(value: readonly DeckSummary[]) {
		// this.logger.debug('[decktracker-decks] setting decks', value);
		this._decks = value;
	}

	constructor(private readonly logger: NGXLogger, private ow: OverwolfService) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}
}
