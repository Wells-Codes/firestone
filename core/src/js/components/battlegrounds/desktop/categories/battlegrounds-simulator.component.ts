import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	OnDestroy,
	ViewRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BgsFaceOffWithSimulation } from '../../../../models/battlegrounds/bgs-face-off-with-simulation';
import { BgsCustomSimulationState } from '../../../../models/mainwindow/battlegrounds/simulator/bgs-custom-simulation-state';
import { AppUiStoreService } from '../../../../services/app-ui-store.service';
import { BgsCustomSimulationChangeMinionRequestEvent } from '../../../../services/mainwindow/store/events/battlegrounds/simulator/bgs-custom-simulation-change-minion-request-event';
import { BgsCustomSimulationMinionRemoveRequestEvent } from '../../../../services/mainwindow/store/events/battlegrounds/simulator/bgs-custom-simulation-minion-remove-request-event';
import { BgsCustomSimulationUpdateMinionRequestEvent } from '../../../../services/mainwindow/store/events/battlegrounds/simulator/bgs-custom-simulation-update-minion-request-event';
import { MainWindowStoreEvent } from '../../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../../services/overwolf.service';
import { ChangeMinionRequest } from '../../battles/bgs-battle-side.component';

@Component({
	selector: 'battlegrounds-simulator',
	styleUrls: [
		`../../../../../css/global/components-global.scss`,
		`../../../../../css/component/battlegrounds/desktop/categories/battlegrounds-simulator.component.scss`,
	],
	template: `
		<div class="battlegrounds-simulator">
			<bgs-battle
				class="battle"
				[faceOff]="faceOff"
				[hideActualBattle]="true"
				[clickToChange]="true"
				[allowClickToAdd]="true"
				[closeOnMinion]="true"
				(playerPortraitChangeRequested)="onPlayerPortraitChangeRequested()"
				(opponentPortraitChangeRequested)="onOpponentPortraitChangeRequested()"
				(playerMinionChangeRequested)="onPlayerMinionChangeRequested($event)"
				(opponentMinionChangeRequested)="onOpponentMinionChangeRequested($event)"
				(playerMinionUpdateRequested)="onPlayerMinionUpdateRequested($event)"
				(opponentMinionUpdateRequested)="onOpponentMinionUpdateRequested($event)"
				(playerMinionRemoveRequested)="onPlayerMinionRemoveRequested($event)"
				(opponentMinionRemoveRequested)="onOpponentMinionRemoveRequested($event)"
			></bgs-battle>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsSimulatorComponent implements AfterViewInit, OnDestroy {
	// @Input() set state(value: BattlegroundsAppState) {
	// 	if (value === this._state) {
	// 		return;
	// 	}
	// 	this._state = value;
	// 	this.updateInfo();
	// }

	faceOff: BgsFaceOffWithSimulation;

	// private _state: BattlegroundsAppState;
	private state$: Subscription;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(
		private readonly store: AppUiStoreService,
		private readonly ow: OverwolfService,
		private readonly cdr: ChangeDetectorRef,
	) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		this.state$ = this.store
			.listen((state) => state.battlegrounds.customSimulationState)
			.subscribe((newState) => this.updateInfo(newState));
	}

	ngOnDestroy() {
		this.state$.unsubscribe();
	}

	onPlayerPortraitChangeRequested() {
		console.debug('request to change player portrait');
		// this.stateUpdater.next(new BgsCustomSimulationChangeHeroRequestEvent('player'));
	}

	onOpponentPortraitChangeRequested() {
		console.debug('request to change opponent portrait');
		// this.stateUpdater.next(new BgsCustomSimulationChangeHeroRequestEvent('opponnent'));
	}

	onPlayerMinionChangeRequested(event: ChangeMinionRequest) {
		console.debug('request to change minion to player warband', event);
		this.stateUpdater.next(new BgsCustomSimulationChangeMinionRequestEvent('player', event?.index));
	}

	onOpponentMinionChangeRequested(event: ChangeMinionRequest) {
		console.debug('request to change minion to opp warband', event);
		this.stateUpdater.next(new BgsCustomSimulationChangeMinionRequestEvent('opponent', event?.index));
	}

	onPlayerMinionUpdateRequested(event: ChangeMinionRequest) {
		console.debug('request to Update minion to player warband', event);
		this.stateUpdater.next(new BgsCustomSimulationUpdateMinionRequestEvent('player', event?.index));
	}

	onOpponentMinionUpdateRequested(event: ChangeMinionRequest) {
		console.debug('request to Update minion to opp warband', event);
		this.stateUpdater.next(new BgsCustomSimulationUpdateMinionRequestEvent('opponent', event?.index));
	}

	onPlayerMinionRemoveRequested(event: ChangeMinionRequest) {
		console.debug('request to remove minion to player warband', event);
		this.stateUpdater.next(new BgsCustomSimulationMinionRemoveRequestEvent('player', event.index));
	}

	onOpponentMinionRemoveRequested(event: ChangeMinionRequest) {
		console.debug('request to remove minion to opp warband', event);
		this.stateUpdater.next(new BgsCustomSimulationMinionRemoveRequestEvent('opponent', event.index));
	}

	private updateInfo(state: BgsCustomSimulationState) {
		console.debug('received info in sim', state);
		this.faceOff = state.faceOff;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}
}
