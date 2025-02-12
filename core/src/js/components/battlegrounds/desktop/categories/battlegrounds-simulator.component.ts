import { AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { BgsFaceOffWithSimulation } from '../../../../models/battlegrounds/bgs-face-off-with-simulation';
import { BgsCustomSimulationResetEvent } from '../../../../services/mainwindow/store/events/battlegrounds/simulator/bgs-custom-simulation-reset-event';
import { BgsCustomSimulationUpdateEvent } from '../../../../services/mainwindow/store/events/battlegrounds/simulator/bgs-custom-simulation-update-event';
import { AppUiStoreFacadeService } from '../../../../services/ui-store/app-ui-store-facade.service';
import { AbstractSubscriptionComponent } from '../../../abstract-subscription.component';

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
				[faceOff]="faceOff$ | async"
				[hideActualBattle]="true"
				[clickToChange]="true"
				[allowClickToAdd]="true"
				[closeOnMinion]="true"
				[fullScreenMode]="true"
				[showTavernTier]="true"
				[simulationUpdater]="simulationUpdater"
				[simulationReset]="simulationReset"
			></bgs-battle>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsSimulatorComponent
	extends AbstractSubscriptionComponent
	implements AfterContentInit, AfterViewInit {
	simulationUpdater: (currentFaceOff: BgsFaceOffWithSimulation, partialUpdate: BgsFaceOffWithSimulation) => void;
	simulationReset: (faceOffId: string) => void;

	faceOff$: Observable<BgsFaceOffWithSimulation>;

	constructor(protected readonly store: AppUiStoreFacadeService, protected readonly cdr: ChangeDetectorRef) {
		super(store, cdr);
	}

	ngAfterContentInit(): void {
		this.faceOff$ = this.store
			.listen$(([main, nav]) => main.battlegrounds.customSimulationState)
			.pipe(
				filter(([state]) => !!state),
				this.mapData(([state]) => state.faceOff),
				tap((faceOff) => console.debug('[cd] faceOff in ', this.constructor.name, faceOff)),
				takeUntil(this.destroyed$),
			);
	}

	ngAfterViewInit(): void {
		this.simulationUpdater = (currentFaceOff, partialUpdate) => {
			this.store.send(new BgsCustomSimulationUpdateEvent(currentFaceOff, partialUpdate));
		};
		this.simulationReset = (faceOffId: string) => {
			this.store.send(new BgsCustomSimulationResetEvent(faceOffId));
		};
	}
}
