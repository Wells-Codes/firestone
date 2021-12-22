import {
	AfterContentInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	OnDestroy,
	ViewRef,
} from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil, tap } from 'rxjs/operators';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DebugService } from '../../../services/debug.service';
import { OverwolfService } from '../../../services/overwolf.service';
import { AppUiStoreFacadeService } from '../../../services/ui-store/app-ui-store-facade.service';
import { cdLog } from '../../../services/ui-store/app-ui-store.service';
import { arraysEqual } from '../../../services/utils';
import { AbstractSubscriptionComponent } from '../../abstract-subscription.component';

@Component({
	selector: 'opponent-hand-overlay',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/overlays/opponenthand/opponent-hand-overlay.component.scss',
	],
	template: `
		<div class="opponent-hand-overlay">
			<opponent-card-infos
				[cards]="hand$ | async"
				[displayTurnNumber]="displayTurnNumber$ | async"
				[displayGuess]="displayGuess$ | async"
				[displayBuff]="displayBuff$ | async"
			></opponent-card-infos>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpponentHandOverlayComponent extends AbstractSubscriptionComponent implements AfterContentInit, OnDestroy {
	hand$: Observable<readonly DeckCard[]>;
	displayTurnNumber$: Observable<boolean>;
	displayGuess$: Observable<boolean>;
	displayBuff$: Observable<boolean>;

	constructor(
		private readonly ow: OverwolfService,
		private readonly init_DebugService: DebugService,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(store, cdr);
	}

	ngAfterContentInit(): void {
		this.hand$ = this.store
			.listenDeckState$((deckState) => deckState?.opponentDeck?.hand)
			.pipe(
				filter(([hand]) => !!hand?.length),
				distinctUntilChanged(arraysEqual),
				map(([hand]) => hand),
				tap((filter) =>
					setTimeout(() => {
						if (!(this.cdr as ViewRef)?.destroyed) {
							this.cdr.detectChanges();
						}
					}, 0),
				),
				tap((filter) => cdLog('emitting hand in ', this.constructor.name, filter)),
				takeUntil(this.destroyed$),
			);
		this.displayTurnNumber$ = this.listenForBasicPref$((prefs) => prefs.dectrackerShowOpponentTurnDraw);
		this.displayGuess$ = this.listenForBasicPref$((prefs) => prefs.dectrackerShowOpponentGuess);
		this.displayBuff$ = this.listenForBasicPref$((prefs) => prefs.dectrackerShowOpponentBuffInHand);
	}
}