import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	ViewRef,
} from '@angular/core';
import { BoosterType } from '@firestone-hs/reference-data';
import { PackResult } from '@firestone-hs/retrieve-pack-stats';
import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { PackInfo } from '../../models/collection/pack-info';
import { BinderState } from '../../models/mainwindow/binder-state';
import { Preferences } from '../../models/preferences';
import { boosterIdToBoosterName, getPackDustValue } from '../../services/hs-utils';
import { MainWindowStoreEvent } from '../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../services/overwolf.service';

@Component({
	selector: 'pack-stats',
	styleUrls: [`../../../css/global/scrollbar.scss`, `../../../css/component/collection/pack-stats.component.scss`],
	template: `
		<div class="pack-stats" scrollable>
			<div class="header">
				All-time packs ({{ totalPacks$ | async }})
				<preference-toggle
					class="show-buyable-packs"
					[ngClass]="{ 'active': showOnlyBuyablePacks }"
					field="collectionShowOnlyBuyablePacks"
					label="Only show main packs"
					helpTooltip="Show only the packs that can be bought in the shop, hiding all promotional / reward packs"
				></preference-toggle>
			</div>
			<div class="packs-container">
				<div
					class="pack-stat"
					*ngFor="let pack of packs$ | async; trackBy: trackByPackFn"
					[ngClass]="{ 'missing': !pack.totalObtained }"
				>
					<div
						class="icon-container"
						[style.width.px]="cardWidth"
						[style.height.px]="cardHeight"
					>
						<img
							class="icon"
							[src]="'https://static.zerotoheroes.com/hearthstone/cardPacks/' + pack.packType + '.webp'"
						/>
					</div>
					<div class="value">{{ pack.totalObtained }}</div>
				</div>
			</div>
			<div
				class="header best-packs-header"
				*ngIf="bestPacks?.length"
				helpTooltip="Best packs you opened with Firestone running"
			>
				Best {{ bestPacks.length }} opened packs
			</div>
			<div class="best-packs-container" *ngIf="bestPacks?.length">
				<div class="best-pack" *ngFor="let pack of bestPacks">
					<pack-history-item class="info" [historyItem]="pack"></pack-history-item>
					<pack-display class="display" [pack]="pack"></pack-display>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionPackStatsComponent implements AfterViewInit {
	readonly DEFAULT_CARD_WIDTH = 115;
	readonly DEFAULT_CARD_HEIGHT = 155;

	cardWidth = this.DEFAULT_CARD_WIDTH;
	cardHeight = this.DEFAULT_CARD_HEIGHT;

	cardsOwnedActiveFilter: 'own' | 'dontown' | 'all';

	@Input() set state(value: BinderState) {
		this._state$.next(value);
	}

	@Input() set prefs(value: Preferences) {
		this._prefs$.next(value);
	}

	// @Input() set navigation(value: NavigationCollection) {
	// 	// this._navigation = value;
	// }

	packs$: Observable<InternalPackInfo[]>;
	totalPacks$: Observable<number>;

	private _state$ = new ReplaySubject<BinderState>();
	private _prefs$ = new ReplaySubject<Preferences>();

	_inputPacks: readonly PackInfo[];
	_packs: readonly InternalPackInfo[] = [];
	_packStats: readonly PackResult[];
	// _navigation: NavigationCollection;
	totalPacks: number;
	bestPacks: readonly PackResult[] = [];

	showOnlyBuyablePacks: boolean;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(private readonly ow: OverwolfService, private readonly cdr: ChangeDetectorRef) {
		this.packs$ = combineLatest(this._prefs$, this._state$).pipe(
			map(([prefs, state]) => this.getFilteredPacks(state.packs, prefs.collectionShowOnlyBuyablePacks)),
			startWith([])
		)

		this.totalPacks$ = this.packs$.pipe(
			map(packs => packs.map(pack => pack.totalObtained).reduce((a, b) => a + b, 0)),
			startWith(0)
		)
	}

	async ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	trackByPackFn(index: number, item: InternalPackInfo) {
		return item.packType;
	}

	// toggleShowOnlyBuyablePacks = (value: boolean) => {
	// 	if (value === this.showOnlyBuyablePacks) {
	// 		return;
	// 	}

	// 	this.showOnlyBuyablePacks = value;
	// 	this.updateInfos();
	// };

	private getFilteredPacks(packs: readonly PackInfo[], showOnlyBuyable: boolean): InternalPackInfo[] {
		if(!packs) { return }

		return Object.values(BoosterType)
		.filter((boosterId: BoosterType) => !isNaN(boosterId))
		.filter((boosterId: BoosterType) => !EXCLUDED_BOOSTER_IDS.includes(boosterId))
		.filter(
			(boosterId: BoosterType) =>
				!showOnlyBuyable || !NON_BUYABLE_BOOSTER_IDS.includes(boosterId),
		)
		.map((boosterId: BoosterType) => ({
			packType: boosterId,
			totalObtained: packs.find(p => p.packType === boosterId)?.totalObtained ?? 0,
			unopened: 0,
			name: boosterIdToBoosterName(boosterId),
		}))
		.filter(info => info)
		.reverse();
	}

	private updateInfos() {
		if (!this._packs || !this._packStats) {
			return;
		}

		const orderedPacks = [...this._packStats].sort((a, b) => getPackDustValue(b) - getPackDustValue(a));
		// console.debug('best poacks', orderedPacks);
		this.bestPacks = orderedPacks.slice(0, 5);

		this._packs = [];
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
		setTimeout(() => {
			this._packs = Object.values(BoosterType)
				.filter((boosterId: BoosterType) => !isNaN(boosterId))
				.filter((boosterId: BoosterType) => !EXCLUDED_BOOSTER_IDS.includes(boosterId))
				.filter(
					(boosterId: BoosterType) =>
						!this.showOnlyBuyablePacks || !NON_BUYABLE_BOOSTER_IDS.includes(boosterId),
				)
				.map((boosterId: BoosterType) => ({
					packType: boosterId,
					totalObtained: this._inputPacks.find(p => p.packType === boosterId)?.totalObtained ?? 0,
					unopened: 0,
					name: boosterIdToBoosterName(boosterId),
				}))
				.filter(info => info)
				.reverse();
			this.totalPacks = this._packs.map(pack => pack.totalObtained).reduce((a, b) => a + b, 0);
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		}, 200);
	}
}

const EXCLUDED_BOOSTER_IDS = [
	BoosterType.INVALID,
	BoosterType.SIGNUP_INCENTIVE,
	BoosterType.FIRST_PURCHASE,
	BoosterType.FIRST_PURCHASE_OLD,
	BoosterType.MAMMOTH_BUNDLE,
	BoosterType.WAILING_CAVERNS,
];

const NON_BUYABLE_BOOSTER_IDS = [
	BoosterType.INVALID,
	BoosterType.FIRST_PURCHASE_OLD,
	BoosterType.FIRST_PURCHASE,
	BoosterType.SIGNUP_INCENTIVE,
	BoosterType.GOLDEN_CLASSIC_PACK,
	BoosterType.GOLDEN_SCHOLOMANCE,
	BoosterType.GOLDEN_DARKMOON_FAIRE,
	BoosterType.GOLDEN_THE_BARRENS,
	BoosterType.MAMMOTH_BUNDLE,
	BoosterType.YEAR_OF_DRAGON,
	BoosterType.YEAR_OF_PHOENIX,
	BoosterType.STANDARD_HUNTER,
	BoosterType.STANDARD_MAGE,
	BoosterType.STANDARD_PALADIN,
	BoosterType.STANDARD_PRIEST,
	BoosterType.STANDARD_ROGUE,
	BoosterType.STANDARD_WARRIOR,
];

interface InternalPackInfo extends PackInfo {
	readonly name: string;
}
