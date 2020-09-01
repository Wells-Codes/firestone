import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewRef } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { inflate } from 'pako';
import { GameState } from '../../../../models/decktracker/game-state';
import { GameEvent } from '../../../../models/game-event';
import fakeBgsState from './bgsState.json';
import fakeState from './gameState.json';
import { TwitchBgsState } from './twitch-bgs-state';

const EBS_URL = 'https://ebs.firestoneapp.com/deck';
// const EBS_URL = 'https://localhost:8081/deck';

@Component({
	selector: 'decktracker-overlay-container',
	styleUrls: [
		'../../../../../css/global/components-global.scss',
		'../../../../../css/component/decktracker/overlay/twitch/decktracker-overlay-container.component.scss',
		// '../../../../../css/component/decktracker/overlay/twitch/decktracker-overlay-container-dev.component.scss',
	],
	template: `
		<div class="container drag-boundary">
			<state-mouse-over
				[gameState]="gameState"
				[bgsState]="bgsState"
				*ngIf="gameState || bgsState"
			></state-mouse-over>
			<decktracker-overlay-standalone
				*ngIf="!bgsState?.inGame"
				[gameState]="gameState"
				(dragStart)="onDragStart()"
				(dragEnd)="onDragEnd()"
			>
			</decktracker-overlay-standalone>
			<bgs-simulation-overlay-standalone
				*ngIf="bgsState?.inGame"
				[bgsState]="bgsState"
				(dragStart)="onDragStart()"
				(dragEnd)="onDragEnd()"
			>
			</bgs-simulation-overlay-standalone>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckTrackerOverlayContainerComponent implements AfterViewInit {
	gameState: GameState;
	bgsState: TwitchBgsState;
	activeTooltip: string;

	private twitch;
	private token: string;

	constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private allCards: AllCardsService) {}

	async ngAfterViewInit() {
		if (!(window as any).Twitch) {
			setTimeout(() => this.ngAfterViewInit(), 500);
			return;
		}
		this.twitch = (window as any).Twitch.ext;
		// this.twitch.onContext((context, contextfields) => console.log('oncontext', context, contextfields));
		this.twitch.onAuthorized(auth => {
			console.log('on authorized', auth);
			this.token = auth.token;
			console.log('set token', this.token);
			this.fetchInitialState();
			this.twitch.listen('broadcast', (target, contentType, event) => {
				const deckEvent = JSON.parse(inflate(event, { to: 'string' }));
				console.log('received event', deckEvent);
				this.processEvent(deckEvent);
			});
		});
		console.log('init done');
		await this.allCards.initializeCardsDb();
		this.addDebugGameState();
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	onDragStart() {
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	onDragEnd() {
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	private fetchInitialState() {
		console.log('retrieving initial state');
		const options = {
			headers: { 'Authorization': 'Bearer ' + this.token },
		};
		this.http.get(EBS_URL, options).subscribe(
			(result: any) => {
				console.log('successfully retrieved initial state', result);
				this.processEvent(result);
			},
			error => {
				console.log('could not retrieve initial state, waiting for EBS update');
			},
		);
	}

	private async processEvent(event) {
		if (event.type === 'bgs') {
			this.bgsState = event.state;
			console.log('bgs state', this.bgsState);
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		} else {
			switch (event.event.name) {
				case GameEvent.GAME_END:
					console.log('received GAME_END event');
					this.gameState = undefined;
					this.bgsState = undefined;
					if (!(this.cdr as ViewRef)?.destroyed) {
						this.cdr.detectChanges();
					}
					break;
				default:
					console.log('received deck event');
					this.gameState = event.state;
					if (!(this.cdr as ViewRef)?.destroyed) {
						this.cdr.detectChanges();
					}
					break;
			}
		}
	}

	private addDebugGameState() {
		this.gameState = fakeState as any;
		this.bgsState = fakeBgsState as any;
		console.log('loaded fake state', this.gameState, this.bgsState);
	}
}
