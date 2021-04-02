import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { CardTooltipPositionType } from '../../../directives/card-tooltip-position.type';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { DeckZone } from '../../../models/decktracker/view/deck-zone';
import { DynamicZone } from '../../../models/decktracker/view/dynamic-zone';
import { VisualDeckCard } from '../../../models/decktracker/visual-deck-card';

@Component({
	selector: 'deck-list-by-zone',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/decktracker/overlay/deck-list-by-zone.component.scss',
	],
	template: `
		<ul class="deck-list">
			<li *ngFor="let zone of zones; trackBy: trackZone">
				<deck-zone
					[zone]="zone"
					[tooltipPosition]="_tooltipPosition"
					[colorManaCost]="colorManaCost"
					[showUpdatedCost]="showUpdatedCost"
					[showGiftsSeparately]="showGiftsSeparately"
					[side]="side"
				></deck-zone>
			</li>
		</ul>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckListByZoneComponent {
	@Input() colorManaCost: boolean;
	@Input() showUpdatedCost: boolean;
	@Input() showGiftsSeparately: boolean;
	@Input() side: 'player' | 'opponent';

	@Input() set showGlobalEffectsZone(value: boolean) {
		console.log('setting global effect in zone', value);
		this._showGlobalEffectsZone = value;
		this.updateInfo();
	}

	@Input() set hideGeneratedCardsInOtherZone(value: boolean) {
		if (value === this._hideGeneratedCardsInOtherZone) {
			return;
		}
		this._hideGeneratedCardsInOtherZone = value;
		this.updateInfo();
	}

	@Input() set sortCardsByManaCostInOtherZone(value: boolean) {
		if (value === this._sortCardsByManaCostInOtherZone) {
			return;
		}
		this._sortCardsByManaCostInOtherZone = value;
		this.updateInfo();
	}

	@Input() set tooltipPosition(value: CardTooltipPositionType) {
		// console.log('[deck-list-by-zone] setting tooltip position', value);
		this._tooltipPosition = value;
	}

	@Input() set deckState(value: DeckState) {
		if (value === this._deckState) {
			return;
		}
		this._deckState = value;
		this.updateInfo();
	}

	zones: readonly DeckZone[];
	_tooltipPosition: CardTooltipPositionType;

	private _showGlobalEffectsZone: boolean;
	private _hideGeneratedCardsInOtherZone: boolean;
	private _sortCardsByManaCostInOtherZone: boolean;
	private _deckState: DeckState;

	trackZone(index, zone: DeckZone) {
		return zone.id;
	}

	@HostListener('window:beforeunload')
	ngOnDestroy(): void {
		this._deckState = null;
		this.zones = null;
	}

	private updateInfo() {
		if (!this._deckState) {
			return;
		}
		const zones = [];
		// console.log('should show global effects zone?', this._showGlobalEffectsZone, this._deckState.globalEffects);
		if (this._showGlobalEffectsZone && this._deckState.globalEffects.length > 0) {
			zones.push(this.buildZone(this._deckState.globalEffects, 'global-effects', 'Global Effects', null, null));
		}
		// console.log('deck state', deckState);
		zones.push(
			Object.assign(
				this.buildZone(this._deckState.deck, 'deck', 'In deck', null, this._deckState.cardsLeftInDeck),
				{
					showWarning: this._deckState.showDecklistWarning,
				} as DeckZone,
			),
		);
		zones.push(
			this.buildZone(this._deckState.hand, 'hand', 'In hand', null, this._deckState.hand.length, null, 'in-hand'),
		);
		// If there are no dynamic zones, we use the standard "other" zone
		if (this._deckState.dynamicZones.length === 0) {
			const otherZone = [...this._deckState.otherZone, ...this._deckState.board];
			zones.push(
				this.buildZone(
					otherZone,
					'other',
					'Other',
					this._sortCardsByManaCostInOtherZone ? (a, b) => a.manaCost - b.manaCost : null,
					null,
					// We want to keep the info in the deck state (that there are cards in the SETASIDE zone) but
					// not show them in the zones
					// (a: VisualDeckCard) => a.zone !== 'SETASIDE',
					// Cards like Tracking put cards from the deck to the SETASIDE zone, so we want to
					// keep them in fact. We have added a specific flag for cards that are just here
					// for technical reasons
					(a: VisualDeckCard) =>
						!a.temporaryCard &&
						!(this._hideGeneratedCardsInOtherZone && a.creatorCardId) &&
						!(this._hideGeneratedCardsInOtherZone && a.creatorCardIds && a.creatorCardIds.length > 0),
				),
			);
			// console.log('zones', zones, otherZone);
		}
		// Otherwise, we add all the dynamic zones
		this._deckState.dynamicZones.forEach(zone => {
			zones.push(this.buildDynamicZone(zone, null));
		});
		this.zones = zones as readonly DeckZone[];
	}

	private buildDynamicZone(
		zone: DynamicZone,
		sortingFunction: (a: VisualDeckCard, b: VisualDeckCard) => number,
	): DeckZone {
		return {
			id: zone.id,
			name: zone.name,
			cards: zone.cards.map(card =>
				Object.assign(new VisualDeckCard(), card, {
					creatorCardIds: (card.creatorCardId ? [card.creatorCardId] : []) as readonly string[],
					lastAffectedByCardIds: (card.lastAffectedByCardId
						? [card.lastAffectedByCardId]
						: []) as readonly string[],
				} as VisualDeckCard),
			),
			numberOfCards: zone.cards.length,
			sortingFunction: sortingFunction,
		} as DeckZone;
	}

	private buildZone(
		cards: readonly DeckCard[],
		id: string,
		name: string,
		sortingFunction: (a: VisualDeckCard, b: VisualDeckCard) => number,
		numberOfCards: number,
		filterFunction?: (a: VisualDeckCard) => boolean,
		highlight?: string,
	): DeckZone {
		// console.log('building zone for', id, name, cards);
		const cardsInZone = cards
			.map(card =>
				Object.assign(new VisualDeckCard(), card, {
					creatorCardIds: (card.creatorCardId ? [card.creatorCardId] : []) as readonly string[],
					lastAffectedByCardIds: (card.lastAffectedByCardId
						? [card.lastAffectedByCardId]
						: []) as readonly string[],
					highlight: highlight,
				} as VisualDeckCard),
			)
			.filter(card => !filterFunction || filterFunction(card));
		return {
			id: id,
			name: name,
			cards: cardsInZone,
			sortingFunction: sortingFunction,
			numberOfCards: numberOfCards != null ? numberOfCards : cardsInZone.length,
		} as DeckZone;
	}
}
