import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	Input,
	Optional,
	ViewRef,
} from '@angular/core';
import { CardTooltipPositionType } from '../../../directives/card-tooltip-position.type';
import { DeckZone } from '../../../models/decktracker/view/deck-zone';
import { VisualDeckCard } from '../../../models/decktracker/visual-deck-card';
import { SetCard } from '../../../models/set';
import { PreferencesService } from '../../../services/preferences.service';
import { groupByFunction } from '../../../services/utils';

@Component({
	selector: 'deck-zone',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/decktracker/overlay/deck-zone.component.scss',
		'../../../../css/component/decktracker/overlay/dim-overlay.scss',
	],
	template: `
		<div class="deck-zone {{ className }}">
			<div class="zone-name-container" *ngIf="zoneName" (mousedown)="toggleZone()">
				<div class="zone-name">
					<span>{{ zoneName }} ({{ cardsInZone }})</span>
					<div *ngIf="showWarning" class="warning">
						<svg
							helpTooltip="The actual cards in this deck are randomly chosen from all the cards in the list below"
							[bindTooltipToGameWindow]="true"
						>
							<use xlink:href="assets/svg/sprite.svg#attention" />
						</svg>
					</div>
				</div>
				<!-- TODO: collapse caret -->
				<i class="collapse-caret {{ open ? 'open' : 'close' }}">
					<svg class="svg-icon-fill">
						<use xlink:href="assets/svg/sprite.svg#collapse_caret" />
					</svg>
				</i>
			</div>
			<ul class="card-list" *ngIf="open">
				<li *ngFor="let card of cards; trackBy: trackCard">
					<deck-card
						[card]="card"
						[tooltipPosition]="_tooltipPosition"
						[colorManaCost]="colorManaCost"
					></deck-card>
				</li>
			</ul>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckZoneComponent implements AfterViewInit {
	@Input() colorManaCost: boolean;

	@Input() set tooltipPosition(value: CardTooltipPositionType) {
		// console.log('[deck-zone] setting tooltip position', value);
		this._tooltipPosition = value;
	}

	@Input() set showGiftsSeparately(value: boolean) {
		this._showGiftsSeparately = value;
		this.refreshZone();
	}

	// @Input() set showCostReduction(value: boolean) {
	// 	this._showCostReduction = value;
	// 	this.refreshZone();
	// }

	@Input() set zone(zone: DeckZone) {
		this._zone = zone;
		this.refreshZone();
	}

	@Input() set collection(value: readonly SetCard[]) {
		this._collection = value;
		this.refreshZone();
	}

	@Input() side: 'player' | 'opponent';

	_tooltipPosition: CardTooltipPositionType;
	_collection: readonly SetCard[];
	className: string;
	zoneName: string;
	showWarning: boolean;
	cardsInZone = 0;
	cards: readonly VisualDeckCard[];
	open = true;

	private _showGiftsSeparately = true;
	// private _showCostReduction = false;
	private _zone: DeckZone;

	constructor(private readonly cdr: ChangeDetectorRef, @Optional() private readonly prefs: PreferencesService) {}

	async ngAfterViewInit() {
		if (this.prefs) {
			this.open = !(await this.prefs.getZoneToggleDefaultClose(this._zone.name, this.side));
		}
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	toggleZone() {
		this.open = !this.open;
		if (this.prefs) {
			this.prefs.setZoneToggleDefaultClose(this._zone.name, this.side, !this.open);
		}
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	trackCard(index, card: VisualDeckCard) {
		return card.cardId;
	}

	private refreshZone() {
		if (!this._zone) {
			return;
		}
		this.className = this._zone.id;
		this.zoneName = this._zone.name;
		this.showWarning = this._zone.showWarning;
		this.cardsInZone = this._zone.numberOfCards;
		const quantitiesLeftForCard = this.buildQuantitiesLeftForCard(this._zone.cards);
		const grouped: { [cardId: string]: readonly VisualDeckCard[] } = groupByFunction((card: VisualDeckCard) =>
			this.buildGroupingKey(card, quantitiesLeftForCard),
		)(this._zone.cards);
		// console.log('grouped', grouped);
		this.cards = Object.keys(grouped)
			.map(groupingKey => {
				const cards = grouped[groupingKey];
				const creatorCardIds: readonly string[] = [
					...new Set(
						cards
							.map(card => card.creatorCardIds)
							.reduce((a, b) => a.concat(b), [])
							.filter(creator => creator),
					),
				];
				// console.log('creator card ids', creatorCardIds, cards);
				return Object.assign(new VisualDeckCard(), cards[0], {
					totalQuantity: cards.length,
					creatorCardIds: creatorCardIds,
					isMissing: groupingKey.includes('missing'),
				} as VisualDeckCard);
			})
			.sort((a, b) => this.compare(a, b))
			.sort((a, b) => this.sortByIcon(a, b));
		if (this._zone.sortingFunction) {
			// console.log('sorting', this._zone.sortingFunction);
			this.cards = [...this.cards].sort(this._zone.sortingFunction);
		}
		// console.log('setting cards in zone', zone, cardsToDisplay, this.cardsInZone, this.cards, grouped);
	}

	private buildQuantitiesLeftForCard(cards: readonly VisualDeckCard[]) {
		if (!this._collection?.length) {
			return {};
		}

		const result = {};
		for (const card of cards) {
			const cardInCollection = this._collection.find(c => c.id === card.cardId);
			result[card.cardId] = cardInCollection?.getTotalOwned() ?? 0;
		}
		return result;
	}

	private buildGroupingKey(card: VisualDeckCard, quantitiesLeftForCard: { [cardId: string]: number }): string {
		const keyWithGift = this._showGiftsSeparately
			? card.cardId + (card.creatorCardIds || []).reduce((a, b) => a + b, '')
			: card.cardId;
		const keyWithGraveyard = card.zone === 'GRAVEYARD' ? keyWithGift + '-graveyard' : keyWithGift;
		const keyWithCost = keyWithGraveyard + '-' + card.getEffectiveManaCost();
		if (!this._collection?.length) {
			return keyWithCost;
		}

		// const cardInCollection = this._collection.find(c => c.id === card.cardId);
		const quantityToAllocate = quantitiesLeftForCard[card.cardId];
		quantitiesLeftForCard[card.cardId] = quantityToAllocate - 1;
		if (quantityToAllocate > 0) {
			return keyWithCost;
		}

		return keyWithCost + '-missing';
	}

	private compare(a: VisualDeckCard, b: VisualDeckCard): number {
		if (a.manaCost < b.manaCost) {
			return -1;
		}
		if (a.manaCost > b.manaCost) {
			return 1;
		}
		if (a.cardName < b.cardName) {
			return -1;
		}
		if (a.cardName > b.cardName) {
			return 1;
		}
		if (a.creatorCardIds.length === 0) {
			return -1;
		}
		if (b.creatorCardIds.length === 0) {
			return 1;
		}
		return 0;
	}

	private sortByIcon(a: VisualDeckCard, b: VisualDeckCard): number {
		if (a.zone === 'PLAY' && b.zone !== 'PLAY') {
			return -1;
		}
		if (a.zone !== 'PLAY' && b.zone === 'PLAY') {
			return 1;
		}
		if (a.zone === 'GRAVEYARD' && b.zone !== 'GRAVEYARD') {
			return -1;
		}
		if (a.zone !== 'GRAVEYARD' && b.zone === 'GRAVEYARD') {
			return 1;
		}
		if (a.zone === 'DISCARD' && b.zone !== 'DISCARD') {
			return -1;
		}
		if (a.zone !== 'DISCARD' && b.zone === 'DISCARD') {
			return 1;
		}
		return 0;
	}

	// private groupBy(list, keyGetter): Map<string, VisualDeckCard[]> {
	// 	const map = new Map();
	// 	list.forEach(item => {
	// 		const key = keyGetter(item);
	// 		const collection = map.get(key);
	// 		if (!collection) {
	// 			map.set(key, [item]);
	// 		} else {
	// 			collection.push(item);
	// 		}
	// 	});
	// 	return map;
	// }
}
