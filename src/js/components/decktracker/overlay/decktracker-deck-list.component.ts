import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostListener,
	Input,
	ViewRef,
} from '@angular/core';
import { CardTooltipPositionType } from '../../../directives/card-tooltip-position.type';
import { DeckState } from '../../../models/decktracker/deck-state';
import { Events } from '../../../services/events.service';

@Component({
	selector: 'decktracker-deck-list',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/decktracker/overlay/decktracker-deck-list.component.scss',
		'../../../../css/component/decktracker/overlay/dim-overlay.scss',
		`../../../../css/global/scrollbar-decktracker-overlay.scss`,
	],
	template: `
		<perfect-scrollbar class="deck-list" (scroll)="onScroll($event)" [ngClass]="{ 'active': isScroll }">
			<ng-container [ngSwitch]="displayMode">
				<div class="list-background">/</div>
				<deck-list-by-zone
					*ngSwitchCase="'DISPLAY_MODE_ZONE'"
					[deckState]="_deckState"
					[colorManaCost]="colorManaCost"
					[tooltipPosition]="_tooltipPosition"
				>
				</deck-list-by-zone>
				<grouped-deck-list
					*ngSwitchCase="'DISPLAY_MODE_GROUPED'"
					[deckState]="_deckState"
					[highlightCardsInHand]="highlightCardsInHand"
					[colorManaCost]="colorManaCost"
					[cardsGoToBottom]="cardsGoToBottom"
					[tooltipPosition]="_tooltipPosition"
				>
				</grouped-deck-list>
			</ng-container>
		</perfect-scrollbar>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckTrackerDeckListComponent {
	@Input() displayMode: string;
	@Input() highlightCardsInHand: boolean;
	@Input() colorManaCost: boolean;
	@Input() cardsGoToBottom: boolean;

	_tooltipPosition: CardTooltipPositionType;
	_deckState: DeckState;
	isScroll: boolean;

	@Input() set tooltipPosition(value: CardTooltipPositionType) {
		// console.log('[decktracker-deck-list] setting tooltip position', value);
		this._tooltipPosition = value;
	}

	@Input('deckState') set deckState(deckState: DeckState) {
		this._deckState = deckState;
		setTimeout(() => {
			const contentHeight = this.el.nativeElement.querySelector('.ps-content').getBoundingClientRect().height;
			const containerHeight = this.el.nativeElement.querySelector('.ps').getBoundingClientRect().height;
			this.isScroll = contentHeight > containerHeight;
			this.refresh();
		}, 1000);
	}

	constructor(private el: ElementRef, private cdr: ChangeDetectorRef, private events: Events) {}

	// Prevent the window from being dragged around if user scrolls with click
	@HostListener('mousedown', ['$event'])
	onHistoryClick(event: MouseEvent) {
		// console.log('handling history click', event);
		const rect = this.el.nativeElement.querySelector('.deck-list').getBoundingClientRect();
		// console.log('element rect', r ect);
		const scrollbarWidth = 5;
		if (event.offsetX >= rect.width - scrollbarWidth) {
			event.stopPropagation();
		}
	}

	onScroll(event) {
		// console.log('scrolling');
		// Force immediate clean of the tooltip
		this.events.broadcast(Events.DECK_HIDE_TOOLTIP, 0);
	}

	refresh() {
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}
}
