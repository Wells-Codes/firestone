import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewRef } from '@angular/core';
import { BehaviorSubject, combineLatest, from, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, takeUntil, tap } from 'rxjs/operators';
import { BgsFaceOffWithSimulation } from '../../../models/battlegrounds/bgs-face-off-with-simulation';
import { BgsPlayer } from '../../../models/battlegrounds/bgs-player';
import { BgsNextOpponentOverviewPanel } from '../../../models/battlegrounds/in-game/bgs-next-opponent-overview-panel';
import { AdService } from '../../../services/ad.service';
import { normalizeHeroCardId } from '../../../services/battlegrounds/bgs-utils';
import { AppUiStoreFacadeService } from '../../../services/ui-store/app-ui-store-facade.service';
import { cdLog } from '../../../services/ui-store/app-ui-store.service';
import { areDeepEqual } from '../../../services/utils';
import { AbstractSubscriptionComponent } from '../../abstract-subscription.component';

@Component({
	selector: 'bgs-next-opponent-overview',
	styleUrls: [
		`../../../../css/global/reset-styles.scss`,
		`../../../../css/global/scrollbar.scss`,
		`../../../../css/component/battlegrounds/in-game/bgs-next-opponent-overview.component.scss`,
	],
	template: `
		<div class="container" [ngClass]="{ 'no-ads': !(showAds$ | async) }">
			<div class="content" *ngIf="opponents$ | async as opponents; else emptyState">
				<ng-container
					*ngIf="{
						currentTurn: currentTurn$ | async,
						lastOpponentCardId: lastOpponentCardId$ | async
					} as value"
				>
					<bgs-opponent-overview-big
						[opponent]="opponents[0]"
						[currentTurn]="value.currentTurn"
						[enableSimulation]="enableSimulation$ | async"
						[nextBattle]="nextBattle$ | async"
					></bgs-opponent-overview-big>
					<div class="other-opponents">
						<div class="subtitle" [owTranslate]="'battlegrounds.in-game.opponents.title'"></div>
						<div class="opponents" scrollable>
							<bgs-opponent-overview
								*ngFor="let opponent of otherOpponents$ | async; trackBy: trackByOpponentInfoFn"
								[opponent]="opponent"
								[currentTurn]="value.currentTurn"
								[showLastOpponentIcon]="isLastOpponent(opponent, lastOpponentCardId)"
							></bgs-opponent-overview>
						</div>
					</div>
				</ng-container>
			</div>
			<ng-template #emptyState>
				<div class="content empty-state">
					<i>
						<svg>
							<use xlink:href="assets/svg/sprite.svg#empty_state_tracker" />
						</svg>
					</i>
					<span class="title" [owTranslate]="'battlegrounds.in-game.opponents.empty-state-title'"></span>
					<span
						class="subtitle"
						[owTranslate]="'battlegrounds.in-game.opponents.empty-state-subtitle'"
					></span></div
			></ng-template>
			<div class="left">
				<div
					class="title"
					[helpTooltip]="'battlegrounds.in-game.opponents.score-board-tooltip' | owTranslate"
					[owTranslate]="'battlegrounds.in-game.opponents.score-board-title'"
				></div>
				<bgs-hero-face-offs></bgs-hero-face-offs>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsNextOpponentOverviewComponent extends AbstractSubscriptionComponent implements AfterContentInit {
	enableSimulation$: Observable<boolean>;
	showAds$: Observable<boolean>;
	nextOpponentCardId$: Observable<string>;
	opponents$: Observable<readonly BgsPlayer[]>;
	otherOpponents$: Observable<readonly BgsPlayer[]>;
	currentTurn$: Observable<number>;
	nextBattle$: Observable<BgsFaceOffWithSimulation>;
	lastOpponentCardId$: Observable<string>;

	opponentsSubject$$ = new BehaviorSubject<readonly BgsPlayer[]>([]);

	constructor(
		private readonly ads: AdService,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(store, cdr);
	}

	ngAfterContentInit(): void {
		this.enableSimulation$ = this.store
			.listen$(([main, nav, prefs]) => prefs.bgsEnableSimulation)
			.pipe(
				map(([pref]) => pref),
				distinctUntilChanged(),
				// FIXME
				tap((filter) =>
					setTimeout(() => {
						if (!(this.cdr as ViewRef)?.destroyed) {
							this.cdr.detectChanges();
						}
					}, 0),
				),
				tap((info) => cdLog('emitting enableSimulation in ', this.constructor.name, info)),
				takeUntil(this.destroyed$),
			);
		this.showAds$ = from(this.ads.shouldDisplayAds()).pipe(
			distinctUntilChanged(),
			// FIXME
			tap((filter) =>
				setTimeout(() => {
					if (!(this.cdr as ViewRef)?.destroyed) {
						this.cdr.detectChanges();
					}
				}, 0),
			),
			tap((info) => cdLog('emitting showAds in ', this.constructor.name, info)),
			takeUntil(this.destroyed$),
		);
		this.currentTurn$ = this.store
			.listenBattlegrounds$(([state, prefs]) => state?.currentGame?.currentTurn)
			.pipe(this.mapData(([turn]) => turn));
		const currentPanel$: Observable<BgsNextOpponentOverviewPanel> = this.store
			.listenBattlegrounds$(
				([state]) => state.panels,
				([state]) => state.currentPanelId,
			)
			.pipe(
				filter(([panels, currentPanelId]) => !!panels?.length && !!currentPanelId),
				map(
					([panels, currentPanelId]) =>
						panels.find((panel) => panel.id === currentPanelId) as BgsNextOpponentOverviewPanel,
				),
				filter((panel) => !!panel?.opponentOverview),
				distinctUntilChanged((a, b) => areDeepEqual(a, b)),
				// FIXME
				tap((filter) =>
					setTimeout(() => {
						if (!(this.cdr as ViewRef)?.destroyed) {
							this.cdr.detectChanges();
						}
					}, 0),
				),
				tap((info) => cdLog('emitting currentPanel in ', this.constructor.name, info)),
				takeUntil(this.destroyed$),
			);
		this.nextOpponentCardId$ = currentPanel$.pipe(
			map((panel) => panel.opponentOverview.cardId),
			distinctUntilChanged(),
			// FIXME
			tap((filter) =>
				setTimeout(() => {
					if (!(this.cdr as ViewRef)?.destroyed) {
						this.cdr.detectChanges();
					}
				}, 0),
			),
			tap((info) => cdLog('emitting nextOpponentCardId in ', this.constructor.name, info)),
			takeUntil(this.destroyed$),
		);
		this.lastOpponentCardId$ = this.store
			.listenBattlegrounds$(([state]) => state.currentGame?.lastOpponentCardId)
			.pipe(
				map(([lastOpponentCardId]) => lastOpponentCardId),
				distinctUntilChanged(),
				// FIXME
				tap((filter) =>
					setTimeout(() => {
						if (!(this.cdr as ViewRef)?.destroyed) {
							this.cdr.detectChanges();
						}
					}, 0),
				),
				tap((info) => cdLog('emitting lastOpponentCardId in ', this.constructor.name, info)),
				takeUntil(this.destroyed$),
			);
		this.nextBattle$ = this.store
			.listenBattlegrounds$(([state]) => state.currentGame)
			.pipe(
				filter(([game]) => !!game),
				map(([game]) => game.lastFaceOff()),
				distinctUntilChanged((a, b) => areDeepEqual(a, b)),
				// FIXME
				tap((filter) =>
					setTimeout(() => {
						if (!(this.cdr as ViewRef)?.destroyed) {
							this.cdr.detectChanges();
						}
					}, 0),
				),
				tap((info) => cdLog('emitting nextBattle in ', this.constructor.name, info)),
				takeUntil(this.destroyed$),
			);
		combineLatest(
			this.nextOpponentCardId$,
			this.store.listenBattlegrounds$(([state]) => state.currentGame),
		)
			.pipe(
				debounceTime(1000),
				filter(([nextOpponentCardId, [game]]) => !!game),
				map(([nextOpponentCardId, [game]]) =>
					game.players
						.filter((player) => !player.isMainPlayer)
						.sort((a, b) => {
							if (a.leaderboardPlace < b.leaderboardPlace) {
								return -1;
							}
							if (b.leaderboardPlace < a.leaderboardPlace) {
								return 1;
							}
							if (a.damageTaken < b.damageTaken) {
								return -1;
							}
							if (b.damageTaken < a.damageTaken) {
								return 1;
							}
							return 0;
						})
						.sort((a, b) =>
							a.cardId === nextOpponentCardId ? -1 : b.cardId === nextOpponentCardId ? 1 : 0,
						),
				),
				distinctUntilChanged((a, b) => areDeepEqual(a, b)),
				// FIXME
				tap((filter) =>
					setTimeout(() => {
						if (!(this.cdr as ViewRef)?.destroyed) {
							this.cdr.detectChanges();
						}
					}, 0),
				),
				tap((info) => cdLog('emitting opponents in ', this.constructor.name, info)),
				takeUntil(this.destroyed$),
			)
			.subscribe((opponents) => this.opponentsSubject$$.next(opponents));
		this.opponents$ = this.opponentsSubject$$.asObservable();
		this.otherOpponents$ = this.opponentsSubject$$.asObservable().pipe(
			map((opponents) => opponents.slice(1)),
			// distinctUntilChanged((a, b) => areDeepEqual(a, b)),
			// FIXME
			tap((filter) =>
				setTimeout(() => {
					if (!(this.cdr as ViewRef)?.destroyed) {
						this.cdr.detectChanges();
					}
				}, 0),
			),
			tap((info) => cdLog('emitting otherOpponents in ', this.constructor.name, info)),
			takeUntil(this.destroyed$),
		);
	}

	trackByOpponentInfoFn(index, item: BgsPlayer) {
		return item.cardId;
	}

	isLastOpponent(opponent: BgsPlayer, lastOpponentCardId: string): boolean {
		const result = normalizeHeroCardId(opponent.cardId) === lastOpponentCardId;
		return result;
	}
}
