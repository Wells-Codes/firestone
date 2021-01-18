import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	Input,
	Renderer2,
} from '@angular/core';
import { Entity } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { BgsPlayer } from '../../../models/battlegrounds/bgs-player';
import { BgsTavernUpgrade } from '../../../models/battlegrounds/in-game/bgs-tavern-upgrade';
import { BgsTriple } from '../../../models/battlegrounds/in-game/bgs-triple';

declare let amplitude: any;

@Component({
	selector: 'bgs-opponent-overview',
	styleUrls: [
		`../../../../css/global/reset-styles.scss`,
		`../../../../css/component/battlegrounds/in-game/bgs-opponent-overview.component.scss`,
	],
	template: `
		<div class="opponent-overview">
			<div class="portrait">
				<bgs-hero-portrait
					class="icon"
					[icon]="icon"
					[health]="health"
					[maxHealth]="maxHealth"
					[cardTooltip]="heroPowerCardId"
					[cardTooltipText]="name"
					[cardTooltipClass]="'bgs-hero-power'"
				></bgs-hero-portrait>
				<!-- <div class="name">{{ name }}</div> -->
				<tavern-level-icon [level]="tavernTier" class="tavern"></tavern-level-icon>
			</div>
			<div class="main-info">
				<bgs-board
					[entities]="boardMinions"
					[currentTurn]="currentTurn"
					[boardTurn]="boardTurn"
					[tooltipPosition]="'top'"
					[maxBoardHeight]="1"
				></bgs-board>
			</div>
			<bgs-triples [triples]="triples" [boardTurn]="boardTurn"></bgs-triples>
			<div
				class="last-opponent-icon"
				*ngIf="showLastOpponentIcon"
				helpTooltip="Last round's opponent"
				inlineSVG="assets/svg/victory_icon_deck.svg"
			></div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsOpponentOverviewComponent implements AfterViewInit {
	icon: string;
	health: number;
	maxHealth: number;
	heroPowerCardId: string;
	name: string;
	tavernTier: number;
	boardMinions: readonly Entity[];
	boardTurn: number;
	tavernUpgrades: readonly BgsTavernUpgrade[];
	triples: readonly BgsTriple[];
	debug = false;

	@Input() showLastOpponentIcon: boolean;

	@Input() currentTurn: number;

	@Input() set opponent(value: BgsPlayer) {
		if (value === this._opponent) {
			return;
		}
		this.debug = false; //value.cardId === 'TB_BaconShop_HERO_01';
		if (this.debug) {
			// console.log('setting new opponent', value, this._opponent);
		}
		this._opponent = value;
		if (!value) {
			console.warn('[opponent-overview] setting empty value');
			return;
		}
		this.icon = `https://static.zerotoheroes.com/hearthstone/fullcard/en/256/battlegrounds/${value.getDisplayCardId()}.png`;
		this.health = value.initialHealth - value.damageTaken;
		this.maxHealth = value.initialHealth;
		this.heroPowerCardId = value.getDisplayHeroPowerCardId();
		this.name = value.name;
		this.tavernTier = value.getCurrentTavernTier();
		this.boardMinions = value.getLastKnownBoardState();
		this.boardTurn = value.getLastBoardStateTurn();
		this.tavernUpgrades = value.tavernUpgradeHistory;
		this.triples = value.tripleHistory;
	}

	private _opponent: BgsPlayer;

	constructor(private readonly cdr: ChangeDetectorRef, private el: ElementRef, private renderer: Renderer2) {}

	ngAfterViewInit() {
		if (this.debug) {
			// console.log('after view init in overview');
		}
	}
}
