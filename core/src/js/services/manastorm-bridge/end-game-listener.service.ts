import { Injectable } from '@angular/core';
import { GameType } from '@firestone-hs/reference-data';
import { GameEvent } from '../../models/game-event';
import { GameSettingsEvent } from '../../models/mainwindow/game-events/game-settings-event';
import { MemoryUpdate } from '../../models/memory/memory-update';
import { DeckParserService } from '../decktracker/deck-parser.service';
import { DungeonLootParserService } from '../decktracker/dungeon-loot-parser.service';
import { GameStateService } from '../decktracker/game-state.service';
import { Events } from '../events.service';
import { GameEventsEmitterService } from '../game-events-emitter.service';
import { isMercenaries } from '../mercenaries/mercenaries-utils';
import { sleep } from '../utils';
import { EndGameUploaderService } from './end-game-uploader.service';

@Injectable()
export class EndGameListenerService {
	private currentDeckstring: string;
	private currentDeckname: string;
	private currentBuildNumber: number;
	private currentScenarioId: number;
	private currentGameMode: number;
	private bgsHasPrizes: boolean;
	private bgsNewRating: number;

	constructor(
		private gameEvents: GameEventsEmitterService,
		private events: Events,
		private deckService: DeckParserService,
		private endGameUploader: EndGameUploaderService,
		private gameState: GameStateService,
		private duelsMonitor: DungeonLootParserService,
	) {
		this.init();
	}

	private init(): void {
		console.log('[manastorm-bridge] stgarting end-game-listener init');
		this.events.on(Events.MEMORY_UPDATE).subscribe((event) => {
			const changes: MemoryUpdate = event.data[0];
			if (changes.BattlegroundsNewRating) {
				this.bgsNewRating = changes.BattlegroundsNewRating;
				console.log('[manastorm-bridge] assigned BGS new rating', this.bgsNewRating);
			}
		});
		this.gameEvents.allEvents.subscribe(async (gameEvent: GameEvent) => {
			switch (gameEvent.type) {
				case GameEvent.GAME_START:
					this.currentBuildNumber = undefined;
					this.currentScenarioId = undefined;
					this.currentGameMode = undefined;
					this.bgsHasPrizes = undefined;
					console.log('[manastorm-bridge] reset state info');
					break;
				case GameEvent.LOCAL_PLAYER:
					this.listenToDeckUpdate();
					break;
				case GameEvent.MATCH_METADATA:
					this.currentBuildNumber = gameEvent.additionalData.metaData.BuildNumber;
					this.currentScenarioId = gameEvent.additionalData.metaData.ScenarioID;
					this.currentGameMode = gameEvent.additionalData.metaData.GameType;
					break;
				case GameEvent.GAME_SETTINGS:
					this.bgsHasPrizes = (gameEvent as GameSettingsEvent).additionalData?.battlegroundsPrizes;
					console.debug('[manastorm-bridge] bgsHasPrizes', this.bgsHasPrizes);
					break;
				case GameEvent.GAME_END:
					console.log('[manastorm-bridge] end game, uploading?', gameEvent);
					if (gameEvent.additionalData.spectating) {
						console.log('[manastorm-bridge] spectate game, not uploading');
						return;
					}
					// Keep the await / long processes here to a minimum, since
					// we want to start reading all the important memory bits as soon
					// as possible
					const reviewId = await this.gameState.getCurrentReviewId();
					this.stopListenToDeckUpdates();

					await this.endGameUploader.upload(
						gameEvent,
						reviewId,
						this.currentDeckstring,
						this.currentDeckname,
						this.currentBuildNumber,
						this.currentScenarioId,
						{
							hasPrizes: this.bgsHasPrizes,
							bgsNewRating: this.bgsNewRating,
							duelsInfo: {
								wins: this.duelsMonitor.currentDuelsWins,
								losses: this.duelsMonitor.currentDuelsLosses,
								rating: this.duelsMonitor.currentDuelsRating,
								paidRating: this.duelsMonitor.currentDuelsPaidRating,
							},
						},
					);
					break;
			}
		});
	}

	private listening: boolean;

	private async listenToDeckUpdate() {
		// Wait for a while to make sure the deck has been parsed
		await sleep(15_000);
		// This in fact doesn't work, because if the deckService still has a deck in memory from
		// last game, it will be used instead of the current one.
		this.listening = true;
		const currentDeck = await Promise.race([this.deckService.getCurrentDeck(10000), this.listenerTimeout()]);
		if (!currentDeck?.deckstring) {
			if (
				this.currentGameMode !== GameType.GT_BATTLEGROUNDS &&
				this.currentGameMode !== GameType.GT_BATTLEGROUNDS_FRIENDLY &&
				!isMercenaries(this.currentGameMode)
			) {
				console.warn('[manastorm-bridge] no deckstring found', this.currentGameMode);
			}
			return;
		}
		this.currentDeckstring = currentDeck.deckstring;
		console.log('[manastorm-bridge] got local player info, adding deckstring', this.currentDeckstring, currentDeck);
		// First remove the diacritics, then remove the weird unicode characters (deck names can't be fun!)
		this.currentDeckname = currentDeck?.name
			?.normalize('NFKD')
			// Allow some characters
			?.replace(/[^\w^\{^\}^\[^\]$^/^\s]/g, '')
			?.replace(/[^\x20-\x7E]/g, '');
	}

	private stopListenToDeckUpdates() {
		this.listening = false;
	}

	private listenerTimeout(): Promise<any> {
		return new Promise<any>((resolve) => {
			const interval = setInterval(() => {
				if (!this.listening) {
					clearInterval(interval);
					resolve(null);
				}
			}, 100);
		});
	}
}
