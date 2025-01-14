import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AppUiStoreFacadeService } from '../../../services/ui-store/app-ui-store-facade.service';
import { AbstractSubscriptionComponent } from '../../abstract-subscription.component';
import { Knob } from '../preference-slider.component';

@Component({
	selector: 'settings-decktracker-your-deck',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/global/scrollbar-settings.scss`,
		`../../../../css/global/forms.scss`,
		`../../../../css/component/settings/settings-common.component.scss`,
		`../../../../css/component/settings/decktracker/settings-decktracker-your-deck.component.scss`,
	],
	template: `
		<div
			class="decktracker-appearance"
			*ngIf="{ overlayGroupByZone: overlayGroupByZone$ | async } as value"
			scrollable
		>
			<div class="title">Activate / Deactivate features</div>
			<div class="settings-group">
				<div class="subtitle">Your deck</div>
				<div class="subgroup">
					<preference-toggle
						field="overlayGroupByZone"
						label="Group cards by zone"
						tooltip="When active, the tracker will split the cards into collapsable sections. The sections active today are Deck, Hand and Other"
					></preference-toggle>
					<preference-toggle
						[ngClass]="{ 'disabled': value.overlayGroupByZone }"
						class="indented"
						field="overlayCardsGoToBottom"
						label="Used cards go to bottom"
						tooltip="When active, the cards that have been used are shown at the bottom of the list. It can only be activated if the Group cards by zone option is disabled"
					></preference-toggle>
					<preference-toggle
						[ngClass]="{ 'disabled': !value.overlayGroupByZone }"
						class="indented"
						field="overlayShowGlobalEffects"
						label="Show global effects"
						tooltip="When active, a new section appears at the top of the tracker that shows global effects on the game (for now, only Dungeon Run passives)"
					></preference-toggle>
					<preference-toggle
						class="indented"
						field="overlayOverlayDarkenUsedCards"
						label="Darken used cards"
						tooltip="When active, the cards that have been used are darkened."
					></preference-toggle>
					<preference-toggle
						[ngClass]="{ 'disabled': !value.overlayGroupByZone }"
						class="indented"
						field="overlaySortByManaInOtherZone"
						label="Sort cards by mana cost"
						tooltip="When active, the cards will be sorted by mana cost in the Other zone. Otherwise, the zone will first show the cards on the board, then the graveyard, then the others."
					></preference-toggle>
					<preference-toggle
						[ngClass]="{ 'disabled': !value.overlayGroupByZone }"
						class="indented"
						field="overlayHideGeneratedCardsInOtherZone"
						label="Hide generated cards in Other zone"
						tooltip="When active, the cards that didn't start in your deck won't appear in the Other zone"
					></preference-toggle>
					<preference-toggle
						field="decktrackerNoDeckMode"
						label="Ignore decklist"
						tooltip="Don't load the initial decklist and only track played and drawn cards. Changes will be applied for the next game"
						advancedSetting
						messageWhenToggleValue="Got it, the tracker will ignore your decklist"
						[valueToDisplayMessageOn]="true"
					></preference-toggle>
				</div>
				<div class="subtitle">Counters</div>
				<div class="subgroup">
					<preference-toggle
						field="playerGalakrondCounter"
						label="Galakrond Invoke"
						tooltip="Show the number of times you have invoked Galakrond (appears only if the deck contains Galakrond or cards that Invoke Galakrond)"
					></preference-toggle>
					<preference-toggle
						field="playerPogoCounter"
						label="Pogo-Hopper"
						tooltip="Show the number of times you played a Pogo-Hopper (excluding Battlegrounds)"
					></preference-toggle>
					<preference-toggle
						field="playerJadeGolemCounter"
						label="Jade Golem"
						tooltip="Show the current size of your Jade Golems"
					></preference-toggle>
					<preference-toggle
						field="playerCthunCounter"
						label="C'Thun"
						tooltip="Show the current size of your C'Thun"
					></preference-toggle>
					<preference-toggle
						field="playerFatigueCounter"
						label="Fatigue"
						tooltip="Show your current fatigue damage"
					></preference-toggle>
					<preference-toggle
						field="playerAttackCounter"
						label="Attack on board"
						tooltip="Show the total attack of minions on your board + your hero"
					></preference-toggle>
					<preference-toggle
						field="playerSpellCounter"
						label="Number of spells"
						tooltip="Show the total number of spells you played this match. Shows up only if relevant cards are found in the deck or hand"
					></preference-toggle>
					<preference-toggle
						field="playerElementalCounter"
						label="Elementals"
						tooltip="Show the total number of elementals you played this turn and last turn. Shows up only if relevant cards are found in your hand"
					></preference-toggle>
					<preference-toggle
						field="playerWatchpostCounter"
						label="Watch Posts"
						tooltip="Show the total number of watch posts you played this match. Shows up only if relevant cards are found in the deck or hand"
					></preference-toggle>
					<preference-toggle
						field="playerLibramCounter"
						label="Librams"
						tooltip="Show the total number of librams you played this match. Shows up only if relevant cards are found in the deck or hand"
					></preference-toggle>
					<preference-toggle
						field="playerElwynnBoarCounter"
						label="Elwynn Boar deaths"
						tooltip="Show the number of times an Elwynn Boar died for you"
					></preference-toggle>
					<preference-toggle
						field="playerHeroPowerDamageCounter"
						label="Hero Power damage"
						tooltip="Show the total damage done by your hero power this match. Shows up only if Mordresh Fire Eye or Jan'Alai the Dragonhawk are in your deck."
					></preference-toggle>
					<preference-toggle
						field="playerBolnerCounter"
						label="Bolner Hammerbeak"
						tooltip="When you have Bolner Hammerbeak in hand, show the first Battlecry card that was played this turn, if any"
					></preference-toggle>
					<preference-toggle
						field="playerBrilliantMacawCounter"
						[label]="'counters.brilliant-macaw.settings-name' | owTranslate"
						[tooltip]="'counters.brilliant-macaw.settings-tooltip' | owTranslate"
					></preference-toggle>
					<preference-toggle
						field="playerMulticasterCounter"
						label="Multicaster"
						tooltip="Show the spell schools of which you played a spell this game"
					></preference-toggle>
				</div>
			</div>
			<div class="title">Tracker's size & opacity</div>
			<div class="settings-group">
				<div class="subtitle">Your deck</div>
				<preference-slider
					class="first-slider"
					[field]="'decktrackerScale'"
					[enabled]="true"
					[min]="50"
					[max]="125"
					[snapSensitivity]="5"
					[knobs]="sizeKnobs"
				>
				</preference-slider>
				<div class="text">Opacity</div>
				<preference-slider
					[field]="'overlayOpacityInPercent'"
					[enabled]="true"
					[min]="40"
					[max]="100"
					[showCurrentValue]="true"
				>
				</preference-slider>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDecktrackerYourDeckComponent extends AbstractSubscriptionComponent implements AfterContentInit {
	overlayGroupByZone$: Observable<boolean>;
	sizeKnobs: readonly Knob[] = [
		{
			percentageValue: 0,
			label: 'Small',
		},
		{
			percentageValue: 50,
			label: 'Medium',
		},
		{
			percentageValue: 100,
			label: 'Large',
		},
	];

	constructor(protected readonly store: AppUiStoreFacadeService, protected readonly cdr: ChangeDetectorRef) {
		super(store, cdr);
	}

	ngAfterContentInit() {
		this.overlayGroupByZone$ = this.listenForBasicPref$((prefs) => prefs.overlayGroupByZone);
	}
}
