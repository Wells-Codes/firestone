import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostListener,
	OnDestroy,
	ViewRef,
} from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Preferences } from '../../../models/preferences';
import { FeatureFlags } from '../../../services/feature-flags';
import { OverwolfService } from '../../../services/overwolf.service';
import { PreferencesService } from '../../../services/preferences.service';
import { Knob } from '../preference-slider.component';

@Component({
	selector: 'settings-battlegrounds-general',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/global/scrollbar-settings.scss`,
		`../../../../css/global/forms.scss`,
		`../../../../css/component/settings/settings-common.component.scss`,
		`../../../../css/component/settings/battlegrounds/settings-battlegrounds-general.component.scss`,
	],
	template: `
		<div class="battlegrounds-general" scrollable>
			<preference-toggle
				field="bgsFullToggle"
				label="Enable Battlegrounds"
				tooltip="Turn off to disable all Battlegrounds live features"
			></preference-toggle>
			<div class="title">Companion App</div>
			<div class="settings-group">
				<div class="subgroup">
					<preference-toggle field="bgsEnableApp" label="Enable App"></preference-toggle>
					<preference-toggle
						field="bgsEnableSimulation"
						[ngClass]="{ 'disabled': !bgsFullToggle }"
						label="Enable battle simulation"
						tooltip="When active, you will know your chances to win / tie / lose each battle at the start of the battle"
					></preference-toggle>
					<preference-toggle
						field="bgsUseLocalSimulator"
						[ngClass]="{ 'disabled': !enableSimulation || !bgsFullToggle }"
						label="Use local battle simulator"
						tooltip="Turning that off will run the battle simulations on a remote server, thus freeing your machine up. On the other hand, the results will take a bit longer to arrive"
					></preference-toggle>
					<preference-toggle
						field="bgsUseLocalPostMatchStats"
						[ngClass]="{ 'disabled': !bgsEnableApp || !bgsFullToggle }"
						label="Compute post-match stats locally"
						tooltip="When turned on, the stats that appear on the post-match screen will be computed locally, which is faster but can be CPU intensive. Turn it off to compute the stats on the cloud (it will take a bit more time though)"
					></preference-toggle>
					<preference-toggle
						field="bgsUseOverlay"
						[ngClass]="{ 'disabled': !bgsEnableApp || !bgsFullToggle }"
						label="Set integrated mode"
						tooltip="When turned on, the battlegrounds window becomes an overlay, and is bound to the game window. Using this is recommended for single monitor setups, or if you want to stream the app"
					></preference-toggle>
					<preference-toggle
						field="bgsForceShowPostMatchStats"
						[ngClass]="{ 'disabled': !bgsEnableApp || !bgsFullToggle }"
						label="Show post-match stats"
						tooltip="When active, the battlegrounds window will be restored after a match to show the post-match stats, even if it was minimized"
					></preference-toggle>
				</div>
			</div>
			<div class="title">
				Overlay configuration
			</div>
			<div class="settings-group">
				<preference-toggle
					field="bgsShowBannedTribesOverlay"
					[ngClass]="{ 'disabled': !bgsFullToggle }"
					label="Show banned tribes"
					tooltip="Adds a small widget that shows what tribes are banned in the current run"
				></preference-toggle>
				<preference-toggle
					field="bgsEnableOpponentBoardMouseOver"
					*ngIf="opponentMouseOver"
					[ngClass]="{ 'disabled': !bgsFullToggle }"
					label="Show last opponent board"
					tooltip="Show the last known opponent's board (and additional info) when mousing over their portrait in the leaderboard"
				></preference-toggle>
				<preference-toggle
					field="bgsEnableMinionListOverlay"
					*ngIf="minionsListOverlay"
					[ngClass]="{ 'disabled': !bgsFullToggle }"
					label="Show minions list"
					tooltip="Show the list of minions, grouped by tavern tier"
				></preference-toggle>
				<preference-toggle
					field="bgsShowTribesHighlight"
					*ngIf="showTribesHighlight"
					[ngClass]="{ 'disabled': !bgsFullToggle }"
					label="Show tribes highlight"
					tooltip="Adds buttons to highlight specific tribes in Bob's Tavern"
				></preference-toggle>
				<preference-toggle
					field="bgsEnableBattleSimulationOverlay"
					[ngClass]="{ 'disabled': !enableSimulation || !bgsFullToggle }"
					label="Battle Simulation overlay"
					tooltip="Also show the current battle simulation results as an overlay on top of the game"
				></preference-toggle>
				<preference-toggle
					field="bgsEnableSimulationSampleInOverlay"
					[ngClass]="{
						'disabled': !enableSimulation || !bgsEnableBattleSimulationOverlay || !bgsFullToggle
					}"
					label="Simulation example in overlay"
					tooltip="Adds a button to view an example of how the simulator reached a specific result. WARNING: it will open a new tab in your default browser."
				></preference-toggle>
				<preference-toggle
					field="playerBgsPogoCounter"
					[ngClass]="{ 'disabled': !bgsFullToggle }"
					label="Pogo-Hopper counter"
					tooltip="Show the number of times you played a Pogo-Hopper in Battlegrounds"
				></preference-toggle>
			</div>
			<div class="title">
				Local simulator configuration
			</div>
			<div class="settings-group">
				<div
					class="text"
					[ngClass]="{ 'disabled': !useLocalSimulator || !enableSimulation || !bgsFullToggle }"
					helpTooltip="The number of simulations ran for each battle. We found 2,500 simulations to be a perfect spot. Increasing the number will increase the accuracy of the calculation but will require more resources from your PC."
				>
					Number of simulations
				</div>
				<preference-slider
					class="simulation-slider"
					field="bgsSimulatorNumberOfSims"
					[enabled]="useLocalSimulator && bgsEnableApp && bgsFullToggle"
					[showCurrentValue]="true"
					displayedValueUnit=""
					[min]="700"
					[max]="15000"
					[snapSensitivity]="200"
					[knobs]="numberOfSimsKnobs"
				>
				</preference-slider>
			</div>

			<div class="title">
				Banned tribes
			</div>
			<div class="settings-group" [ngClass]="{ 'disabled': !showBannedTribes || !bgsFullToggle }">
				<preference-toggle
					class="banned-tribes-vertical"
					field="bgsBannedTribesShowVertically"
					[ngClass]="{ 'disabled': !bgsFullToggle }"
					label="Show in column"
					tooltip="When active, banned tribes are shown in a column instead of a row"
				></preference-toggle>
				<div class="text">
					Icon size
				</div>
				<preference-slider
					class="banned-tribes-size-slider"
					field="bgsBannedTribeScale"
					[enabled]="bgsFullToggle"
					[showCurrentValue]="false"
					displayedValueUnit=""
					[min]="80"
					[max]="200"
					[snapSensitivity]="5"
					[knobs]="sizeKnobs"
				>
				</preference-slider>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsBattlegroundsGeneralComponent implements AfterViewInit, OnDestroy {
	opponentMouseOver: boolean = FeatureFlags.ENABLE_BG_OPPONENT_MOUSE_OVER;
	minionsListOverlay: boolean = FeatureFlags.ENABLE_BG_MINIONS_LIST;
	showTribesHighlight: boolean = FeatureFlags.ENABLE_BG_TRIBE_HIGHLIGHT;

	useLocalSimulator: boolean;
	enableSimulation: boolean;
	bgsEnableBattleSimulationOverlay: boolean;
	bgsFullToggle: boolean;
	bgsEnableApp: boolean;
	showBannedTribes: boolean;
	numberOfSimsKnobs: readonly Knob[] = [
		{
			absoluteValue: 2500,
		},
	];
	sizeKnobs: readonly Knob[] = [
		{
			percentageValue: 0,
			label: 'Small',
		},
		{
			percentageValue: 18,
			label: 'Medium',
		},
		{
			percentageValue: 100,
			label: 'Large',
		},
	];

	private preferencesSubscription: Subscription;

	constructor(
		private prefs: PreferencesService,
		private cdr: ChangeDetectorRef,
		private el: ElementRef,
		private ow: OverwolfService,
	) {}

	ngAfterViewInit() {
		this.loadDefaultValues();
		const preferencesEventBus: BehaviorSubject<any> = this.ow.getMainWindow().preferencesEventBus;
		this.preferencesSubscription = preferencesEventBus.asObservable().subscribe(event => {
			const preferences: Preferences = event.preferences;
			this.useLocalSimulator = preferences.bgsUseLocalSimulator;
			this.enableSimulation = preferences.bgsEnableSimulation;
			this.bgsEnableBattleSimulationOverlay = preferences.bgsEnableBattleSimulationOverlay;
			this.bgsEnableApp = preferences.bgsEnableApp;
			this.bgsFullToggle = preferences.bgsFullToggle;
			this.showBannedTribes = preferences.bgsShowBannedTribesOverlay;
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		});
	}

	@HostListener('window:beforeunload')
	ngOnDestroy() {
		this.preferencesSubscription?.unsubscribe();
	}

	private async loadDefaultValues() {
		const prefs = await this.prefs.getPreferences();
		this.useLocalSimulator = prefs.bgsUseLocalSimulator;
		this.enableSimulation = prefs.bgsEnableSimulation;
		this.bgsEnableBattleSimulationOverlay = prefs.bgsEnableBattleSimulationOverlay;
		this.bgsEnableApp = prefs.bgsEnableApp;
		this.bgsFullToggle = prefs.bgsFullToggle;
		this.showBannedTribes = prefs.bgsShowBannedTribesOverlay;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}
}
