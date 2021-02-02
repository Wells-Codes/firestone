import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewRef } from '@angular/core';
import { Race } from '@firestone-hs/reference-data';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { capitalizeFirstLetter } from '../../../services/utils';
import { BgsMinionsGroup } from './bgs-minions-group';

@Component({
	selector: 'bgs-minions-group',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		`../../../../css/global/cdk-overlay.scss`,
		'../../../../css/component/battlegrounds/minions-tiers/bgs-minions-group.component.scss',
	],
	template: `
		<div class="bgs-minions-group">
			<div class="header">
				{{ title }}
			</div>
			<ul class="minions">
				<li
					class="minion"
					*ngFor="let minion of minions"
					[cardTooltip]="minion.cardId"
					[cardTooltipBgs]="true"
					[cardTooltipPosition]="_tooltipPosition"
				>
					<img class="icon" [src]="minion.image" [cardTooltip]="minion.cardId" />
					<div class="name">{{ minion.name }}</div>
				</li>
			</ul>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsMinionsGroupComponent {
	@Input() set tooltipPosition(value: string) {
		this._tooltipPosition = value;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	@Input() set group(value: BgsMinionsGroup) {
		this._group = value;
		this.title = this.buildTitle(value.tribe);
		this.minions = value.minions.map(minion => {
			const card = this.allCards.getCard(minion.id);
			return {
				cardId: minion.id,
				image: `https://static.zerotoheroes.com/hearthstone/cardart/tiles/${minion.id}.jpg`,
				name: card.name,
			};
		});
	}

	title: string;
	minions: readonly Minion[];
	_group: BgsMinionsGroup;
	_tooltipPosition: string;

	constructor(private readonly allCards: AllCardsService, private readonly cdr: ChangeDetectorRef) {}

	private buildTitle(tribe: Race): string {
		switch (tribe) {
			case Race.BLANK:
				return 'No tribe';
			default:
				return capitalizeFirstLetter(Race[tribe].toLowerCase());
		}
	}
}

interface Minion {
	readonly cardId: string;
	readonly image: string;
	readonly name: string;
}