import { Injectable } from '@angular/core';
import {
	Board,
	CardIds,
	GameFormat,
	GameType,
	PRACTICE_ALL,
	ScenarioId,
	SceneMode,
} from '@firestone-hs/reference-data';
import { ReferenceCard } from '@firestone-hs/reference-data/lib/models/reference-cards/reference-card';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { decode, encode } from 'deckstrings';
import { DeckCard } from '../../models/decktracker/deck-card';
import { Metadata } from '../../models/decktracker/metadata';
import { DuelsInfo } from '../../models/duels-info';
import { GameEvent } from '../../models/game-event';
import { DeckInfoFromMemory } from '../../models/mainwindow/decktracker/deck-info-from-memory';
import { MatchInfo } from '../../models/match-info';
import { GameEventsEmitterService } from '../game-events-emitter.service';
import { OverwolfService } from '../overwolf.service';
import { MemoryInspectionService } from '../plugins/memory-inspection.service';
import { groupByFunction } from '../utils';
import { DeckHandlerService } from './deck-handler.service';

@Injectable()
export class DeckParserService {
	private readonly goingIntoQueueRegex = new RegExp('D \\d*:\\d*:\\d*.\\d* BeginEffect blur \\d => 1');

	private readonly deckContentsRegex = new RegExp('I \\d*:\\d*:\\d*.\\d* Deck Contents Received(.*)');
	private readonly deckEditOverRegex = new RegExp('I \\d*:\\d*:\\d*.\\d* Finished Editing Deck(.*)');

	private readonly deckNameRegex = new RegExp('I \\d*:\\d*:\\d*.\\d* ### (.*)');
	private readonly deckstringRegex = new RegExp('I \\d*:\\d*:\\d*.\\d* ([a-zA-Z0-9\\/\\+=]+)$');

	public currentDeck: any = {};
	private previousDeck: any = {};

	private lastDeckTimestamp;
	private currentBlock: string;

	private currentGameType: GameType;
	private currentScenarioId: number;

	private deckSanityDone: boolean;

	constructor(
		private gameEvents: GameEventsEmitterService,
		private memory: MemoryInspectionService,
		private allCards: AllCardsService,
		private ow: OverwolfService,
		private handler: DeckHandlerService,
	) {
		this.gameEvents.allEvents.subscribe((event: GameEvent) => {
			if (event.type === GameEvent.GAME_END) {
				console.log('[deck-parser] resetting deck after game end');
				const shouldStorePreviousDeck =
					this.currentGameType === GameType.GT_VS_AI && PRACTICE_ALL.includes(this.currentScenarioId);
				this.reset(shouldStorePreviousDeck);
				this.currentGameType = undefined;
				this.currentScenarioId = undefined;
			} else if (event.type === GameEvent.MATCH_METADATA) {
				this.currentGameType = event.additionalData.metaData.GameType;
				this.currentScenarioId = event.additionalData.metaData.ScenarioID;
				this.currentDeck.scenarioId = this.currentScenarioId;
				console.log(
					'[deck-parser] setting meta info',
					this.currentGameType,
					this.currentScenarioId,
					this.currentDeck,
				);
			}
			// TODO: this should move elsewhere
			// else if (event.type === GameEvent.SCENE_CHANGED) {
			// 	// Doing that because the first time we access the deck selection screen the memory reading can be weird
			// 	// So we reset the memory reading once the game has been fully loaded
			// 	if (!this.deckSanityDone) {
			// 		const scene = event.additionalData.scene;
			// 		if (
			// 			[
			// 				'scene_tournament',
			// 				'scene_friendly',
			// 				'scene_adventure',
			// 				'unknown_18',
			// 				'scene_pvp_dungeon_run',
			// 				'scene_bacon',
			// 				'scene_arena',
			// 			].includes(scene)
			// 		) {
			// 			console.log('[memory-service] resetting mindvision from GEP once fully in game');
			// 			this.deckSanityDone = true;
			// 			this.memory.reset();
			// 		}
			// 	}
			// } else if (event.type === GameEvent.SCENE_CHANGED_MINDVISION) {
			// 	// Doing that because the first time we access the deck selection screen the memory reading can be weird
			// 	// So we reset the memory reading once the game has been fully loaded
			// 	if (!this.deckSanityDone) {
			// 		const scene: SceneMode = event.additionalData.scene;
			// 		if (
			// 			[
			// 				SceneMode.TOURNAMENT,
			// 				SceneMode.FRIENDLY,
			// 				SceneMode.ADVENTURE,
			// 				SceneMode.PVP_DUNGEON_RUN,
			// 				SceneMode.BACON,
			// 				SceneMode.PACKOPENING,
			// 				SceneMode.COLLECTIONMANAGER,
			// 				SceneMode.GAME_MODE,
			// 			].includes(scene)
			// 		) {
			// 			console.log('[memory-service] resetting mindvision once fully in game');
			// 			this.deckSanityDone = true;
			// 			this.memory.reset();
			// 		}
			// 	}
			// }
		});
		// window['memory'] = this.memory;
		// window['currentScene'] = async () => {
		// 	console.log(
		// 		'[deck-parser] scene',
		// 		await this.memory.getCurrentScene(),
		// 		await this.memory.getCurrentSceneFromMindVision(),
		// 	);
		// };
		// window['deckFromMemory'] = async () => {
		// 	console.log('[deck-parser] deckFromMemory', await this.memory.getActiveDeck(1));
		// };
	}

	public async queueingIntoMatch(logLine: string) {
		// console.log('[deck-parser] will detect active deck from queue?', logLine, this.currentGameType);
		if (
			this.currentGameType === GameType.GT_BATTLEGROUNDS ||
			this.currentGameType === GameType.GT_BATTLEGROUNDS_FRIENDLY ||
			(await this.memory.getCurrentSceneFromMindVision()) === SceneMode.BACON
		) {
			return;
		}

		if (this.goingIntoQueueRegex.exec(logLine)) {
			// We get this as soon as possible, since once the player has moved out from the
			// dekc selection screen the info becomes unavailable
			console.log('[deck-pareser] reading deck from memory');
			const [deckFromMemory, currentScene] = await Promise.all([
				this.memory.getActiveDeck(1),
				this.memory.getCurrentScene(),
			]);
			console.log('[deck-parser] deck from memory', deckFromMemory, currentScene);
			// Don't refresh the deck when leaving the match
			// However scene_gameplay is also the current scene when selecting a friendly deck?
			let currentSceneFromMindVision: number;
			if (currentScene === 'scene_gameplay') {
				// Double check, as there is today an issue with the events from the GEP when in friendly matches
				currentSceneFromMindVision = await this.memory.getCurrentSceneFromMindVision();
				// console.log('[deck-parser] current scene from mindvision', currentSceneFromMindVision);
				// 4 is GAMEPLAY. Will use a proper enum later on if the bug on the GEP is not fixed
				if (currentSceneFromMindVision == 4) {
					return;
				}
				console.log(
					'[deck-parser] mismatch between MindVision and GEP',
					currentScene,
					currentSceneFromMindVision,
					currentSceneFromMindVision == 4,
				);
			}

			console.log(
				'[deck-parser] getting active deck from going into queue',
				currentScene,
				currentSceneFromMindVision,
			);
			// Duels info is available throughout the whole match, so we don't need to aggressively retrieve it
			const activeDeck =
				currentScene === 'unknown_18' ||
				currentScene === 'scene_pvp_dungeon_run' ||
				currentSceneFromMindVision === 18
					? await this.getDuelsInfo()
					: deckFromMemory;
			console.log('[deck-parser] active deck after queue', activeDeck, currentScene);
			if (!activeDeck) {
				console.warn('[deck-parser] could not read any deck from memory');
				return;
			}
			if (this.isDuelsInfo(activeDeck) && activeDeck.Wins === 0 && activeDeck.Losses === 0) {
				console.log('[deck-parser] not relying on memory reading for initial Duels deck, returning');
				this.reset(false);
				return;
			}
			if (activeDeck.DeckList && activeDeck.DeckList.length > 0) {
				console.log(
					'[deck-parser] updating active deck after queue',
					activeDeck,
					this.currentDeck,
					this.currentScenarioId,
				);
				this.updateDeckFromMemory(activeDeck);
				// this.currentDeck.deck = { cards: this.explodeDecklist(activeDeck.DeckList) };
				this.currentDeck.scenarioId = this.currentScenarioId;
			}
		}
	}

	private isDuelsInfo(activeDeck: DeckInfoFromMemory | DuelsInfo): activeDeck is DuelsInfo {
		return (activeDeck as DuelsInfo).Wins !== undefined;
	}

	private async getDuelsInfo(): Promise<DuelsInfo> {
		let result = await this.memory.getDuelsInfo(false, 3);
		if (!result) {
			result = await this.memory.getDuelsInfo(true, 3);
		}
		return result;
	}

	public async getCurrentDeck(usePreviousDeckIfSameScenarioId: boolean, metadata: Metadata): Promise<any> {
		const shouldUseCachedDeck = metadata.gameType !== GameType.GT_VS_AI;
		console.log(
			'[deck-parser] getting current deck',
			this.currentDeck,
			usePreviousDeckIfSameScenarioId,
			shouldUseCachedDeck,
			metadata,
			this.previousDeck,
		);
		if (shouldUseCachedDeck && this.currentDeck?.deck) {
			console.log('[deck-parser] returning cached deck', this.currentDeck);
			return this.currentDeck;
		}
		if (
			(!this.currentDeck || !this.currentDeck.deck) &&
			usePreviousDeckIfSameScenarioId &&
			metadata.scenarioId === this.previousDeck.scenarioId
		) {
			console.log('[deck-parser] using previous deck');
			this.currentDeck = this.previousDeck;
		}
		if (this.memory) {
			console.log('[deck-parser] ready to get active deck');
			const activeDeck = await this.memory.getActiveDeck(2);
			console.log('[deck-parser] active deck from memory', activeDeck);
			if (activeDeck && activeDeck.DeckList && activeDeck.DeckList.length > 0) {
				console.log('[deck-parser] updating active deck', activeDeck, this.currentDeck);
				this.updateDeckFromMemory(activeDeck);
			}
		}
		// console.log(
		// 	'[deck-parser] should try to read deck from logs?',
		// 	scenarioId,
		// 	this.isDeckLogged(scenarioId),
		// 	this.currentDeck?.deck,
		// );
		if (!this.currentDeck?.deck && this.isDeckLogged(metadata.scenarioId)) {
			console.log('[deck-parser] trying to read previous deck from logs', metadata.scenarioId);
			await this.readDeckFromLogFile();
		}
		console.log('[deck-parser] returning current deck', this.currentDeck);
		return this.currentDeck;
	}

	private updateDeckFromMemory(deckFromMemory: DeckInfoFromMemory) {
		console.log('[deck-parser] updating deck from memory', deckFromMemory);
		const decklist: readonly number[] = this.normalizeWithDbfIds(deckFromMemory.DeckList);
		console.log('[deck-parser] normalized decklist with dbf ids', decklist, deckFromMemory.HeroCardId);
		this.currentDeck.deck = {
			format: deckFromMemory.FormatType || GameFormat.FT_WILD,
			cards: this.explodeDecklist(decklist),
			// Add a default to avoid an exception, for cases like Dungeon Runs or whenever you have an exotic hero
			heroes: deckFromMemory.HeroCardId
				? [this.normalizeHero(this.allCards.getCard(deckFromMemory.HeroCardId)?.dbfId) || 7]
				: [7],
		};
		console.log('[deck-parser] building deckstring', this.currentDeck.deck);
		const deckString = encode(this.currentDeck.deck);
		console.log('[deck-parser] built deckstring', deckString);
		this.currentDeck.deckstring = this.normalizeDeckstring(deckString);
		console.log('[deck-parser] updated deck with deckstring', this.currentDeck.deckstring);
	}

	private normalizeWithDbfIds(decklist: readonly (number | string)[]): readonly number[] {
		return decklist.map(cardId => {
			const isDbfId = !isNaN(+cardId);
			const card = isDbfId ? this.allCards.getCardFromDbfId(+cardId) : this.allCards.getCard(cardId as string);
			if (!card?.dbfId) {
				console.warn('[deck-parser] could not find card for dbfId', cardId, isDbfId);
			}
			return card?.dbfId;
		});
	}

	private isDeckLogged(scenarioId: number): boolean {
		return [...PRACTICE_ALL, ScenarioId.ARENA, ScenarioId.RANKED, ScenarioId.DUELS].includes(scenarioId);
	}

	private async readDeckFromLogFile(): Promise<void> {
		const gameInfo = await this.ow.getRunningGameInfo();
		if (!this.ow.gameRunning(gameInfo)) {
			return;
		}
		const logsLocation = gameInfo.executionPath.split('Hearthstone.exe')[0] + 'Logs\\Decks.log';
		const logsContents = await this.ow.getFileContents(logsLocation);
		if (!logsContents) {
			return;
		}
		const lines = logsContents
			.split('\n')
			.filter(line => line && line.length > 0)
			.map(line => line.trim());
		// console.log('[deck-parser] reading deck contents', lines);
		if (lines.length >= 4) {
			console.log('[deck-parser] lets go', lines[lines.length - 4], 'hop', lines[lines.length - 3]);
			const isLastSectionDeckSelectLine =
				lines[lines.length - 4].indexOf('Finding Game With Hero:') !== -1 ||
				lines[lines.length - 4].indexOf('Finding Game With Deck:') !== -1 ||
				lines[lines.length - 4].indexOf('Duels Deck') !== -1 ||
				lines[lines.length - 3].indexOf('Duels Deck') !== -1;
			if (!isLastSectionDeckSelectLine) {
				return;
			}
			// deck name
			this.parseActiveDeck(
				lines[lines.length - 4].indexOf('Duels Deck') !== -1
					? lines[lines.length - 4]
					: lines[lines.length - 3],
			);
			// deckstring
			this.parseActiveDeck(
				lines[lines.length - 4].indexOf('Duels Deck') !== -1
					? lines[lines.length - 2]
					: lines[lines.length - 1],
			);
			console.log('[deck-parser] finished reading previous deck from logs');
		}
	}

	private explodeDecklist(initialDecklist: readonly number[]): any[] {
		console.log('[deck-parser] decklist with dbfids', initialDecklist);
		const groupedById = groupByFunction(cardId => '' + cardId)(initialDecklist);
		// console.log('[deck-parser] groupedById', groupedById);
		const result = Object.keys(groupedById).map(id => [+id, groupedById[id].length]);
		console.log('[deck-parser] exploding decklist result', result);
		return result;
	}

	public parseActiveDeck(data: string) {
		let match = this.deckContentsRegex.exec(data);
		if (match) {
			this.lastDeckTimestamp = Date.now();
			this.currentBlock = 'DECK_CONTENTS';
			console.log('[deck-parser] finished listing deck content');
			return;
		}
		match = this.deckEditOverRegex.exec(data);
		if (match) {
			this.lastDeckTimestamp = Date.now();
			this.currentBlock = 'DECK_EDIT_OVER';
			console.log('[deck-parser] finished editing deck');
			return;
		}
		if (
			data.indexOf('Finding Game With Deck') !== -1 ||
			data.indexOf('Finding Game With Hero') !== -1 ||
			data.indexOf('Duels deck') !== -1
		) {
			this.lastDeckTimestamp = Date.now();
			this.currentBlock = 'DECK_SELECTED';
			console.log('[deck-parser] found deck selection block');
			return;
		}

		if (
			this.lastDeckTimestamp &&
			Date.now() - this.lastDeckTimestamp < 1000 &&
			this.currentBlock !== 'DECK_SELECTED'
		) {
			console.log(
				'[deck-parser] Doesnt look like a deck selection, exiting block',
				this.currentBlock,
				this.lastDeckTimestamp,
				Date.now(),
			);
			// Don't reset the deck here, as it can override a deck built from memory inspection
			// this.reset();
			return;
		}

		console.log('[deck-parser] received log line', data);
		match = this.deckNameRegex.exec(data);
		if (match) {
			// console.log('[deck-parser] matching log line for deck name', data);
			this.currentDeck = {
				name: match[1],
				scenarioId: this.currentScenarioId,
			};
			console.log('[deck-parser] deck init', this.currentDeck);
			return;
		}
		match = this.deckstringRegex.exec(data);
		if (match) {
			console.log('[deck-parser] parsing deckstring', match);
			this.currentDeck = this.currentDeck || {
				scenarioId: this.currentScenarioId,
			};
			this.currentDeck.deckstring = this.normalizeDeckstring(match[1]);
			console.log('[deck-parser] current deck', this.currentDeck);
			this.decodeDeckString();
			console.log('[deck-parser] deckstring decoded', this.currentDeck);
			return;
		}
	}

	public decodeDeckString() {
		if (this.currentDeck) {
			if (this.currentDeck.deckstring) {
				const deck = decode(this.currentDeck.deckstring);
				this.currentDeck.deck = deck;
				return;
			} else {
				this.currentDeck.deck = undefined;
			}
		}
	}

	// By doing this we make sure we don't get a leftover deckstring caused by
	// a game mode that doesn't interact with the Decks.log
	public reset(shouldStorePreviousDeck: boolean) {
		// Keeping the previous deck is useful for modes where you can just restart, eg practice
		if (shouldStorePreviousDeck && this.currentDeck?.deck) {
			this.previousDeck = this.currentDeck;
		}
		this.currentDeck = {};
		console.log('[deck-parser] resetting deck', shouldStorePreviousDeck, this.currentDeck, this.previousDeck);
	}

	public buildDeck(currentDeck: any): readonly DeckCard[] {
		if (currentDeck && currentDeck.deckstring) {
			return this.buildDeckList(currentDeck.deckstring);
		}
		if (!currentDeck || !currentDeck.deck) {
			return [];
		}
		return (
			currentDeck.deck.cards
				// [dbfid, count] pair
				.map(pair => this.buildDeckCards(pair))
				.reduce((a, b) => a.concat(b), [])
				.sort((a: DeckCard, b: DeckCard) => a.manaCost - b.manaCost)
		);
	}

	public buildDeckList(deckstring: string, deckSize = 30): readonly DeckCard[] {
		return this.handler.buildDeckList(deckstring, deckSize);
	}

	public buildEmptyDeckList(deckSize = 30): readonly DeckCard[] {
		return this.handler.buildEmptyDeckList(deckSize);
	}

	public async postProcessDeck(deck: readonly DeckCard[]): Promise<readonly DeckCard[]> {
		if (!deck || deck.length === 0) {
			return deck;
		}
		// console.log('postprocessing', deck);
		const matchInfo = await this.memory.getMatchInfo();
		return deck.map(decKCard => this.postProcessDeckCard(decKCard, matchInfo));
	}

	private postProcessDeckCard(deckCard: DeckCard, matchInfo: MatchInfo): DeckCard {
		const newCardId = this.updateCardId(deckCard.cardId, matchInfo);
		if (newCardId === deckCard.cardId) {
			return deckCard;
		}
		const newCard = this.allCards.getCard(newCardId);
		return deckCard.update({
			cardId: newCard.id,
			cardName: newCard.name,
		} as DeckCard);
	}

	private updateCardId(cardId: string, matchInfo: MatchInfo): string {
		if (cardId !== CardIds.Collectible.Neutral.TransferStudent || !matchInfo) {
			return cardId;
		}

		// Don't use generated card ids here, as they are changing all the time
		switch (matchInfo.boardId) {
			case Board.STORMWIND:
				return 'SCH_199t';
			case Board.ORGRIMMAR:
				return 'SCH_199t2';
			case Board.PANDARIA:
				return 'SCH_199t3';
			case Board.STRANGLETHORN:
				return 'SCH_199t4';
			case Board.NAXXRAMUS:
				return 'SCH_199t5';
			case Board.GOBLINS_VS_GNOMES:
				return 'SCH_199t6';
			case Board.BLACKROCK_MOUNTAIN:
				return 'SCH_199t7';
			case Board.THE_GRAND_TOURNAMENT:
				return 'SCH_199t8';
			case Board.THE_MUSEUM:
				return 'SCH_199t9';
			case Board.EXCAVATION_SITE:
				return 'SCH_199t24';
			case Board.WHISPERS_OF_THE_OLD_GODS:
				return 'SCH_199t10';
			case Board.KARAZHAN:
				return 'SCH_199t11';
			case Board.GADGETZAN:
				return 'SCH_199t12';
			case Board.UNGORO:
				return 'SCH_199t13';
			case Board.ICECROWN_CITADEL:
				return 'SCH_199t14';
			case Board.THE_CATACOMBS:
				return 'SCH_199t15';
			case Board.THE_WITCHWOOD:
				return 'SCH_199t16';
			case Board.THE_BOOMSDAY_PROJECT:
				return 'SCH_199t17';
			case Board.GURUBASHI_ARENA:
				return 'SCH_199t18';
			case Board.DALARAN:
				return 'SCH_199t19';
			case Board.ULDUM_TOMB:
				return 'SCH_199t20';
			case Board.ULDUM_CITY:
				return 'SCH_199t25';
			case Board.DRAGONBLIGHT:
				return 'SCH_199t21';
			case Board.OUTLAND:
				return 'SCH_199t22';
			case Board.SCHOLOMANCE:
				return 'SCH_199t23';
			case Board.DARKMOON_FAIRE:
				return 'SCH_199t26';
			case Board.THE_BARRENS:
				return 'SCH_199t27';
			default:
				return cardId;
		}
	}

	public buildDeckCards(pair): DeckCard[] {
		return this.handler.buildDeckCards(pair);
	}

	public normalizeDeckstring(deckstring: string, heroCardId?: string): string {
		try {
			// console.log('normalizing deckstring', deckstring, heroCardId);
			const deck = decode(deckstring);
			// console.log('deck from deckstring', deckstring, deck);
			deck.heroes = deck.heroes?.map(heroDbfId => this.normalizeHero(heroDbfId, heroCardId));
			const newDeckstring = encode(deck);
			// console.log('normalized deck', newDeckstring, deck);
			return newDeckstring;
		} catch (e) {
			if (deckstring) {
				console.warn('trying to normalize invalid deckstring', deckstring, e);
			}
			return deckstring;
		}
	}

	private normalizeHero(heroDbfId: number, heroCardId?: string): number {
		let card: ReferenceCard;
		// console.log('normalizing hero', heroDbfId, heroCardId);
		if (heroDbfId) {
			card = this.allCards.getCardFromDbfId(+heroDbfId);
		}
		// console.log('found card for hero', card);
		if (!card || !card.id) {
			// console.log('fallbacking to heroCardId', heroCardId);
			card = this.allCards.getCard(heroCardId);
			if (!card || !card.id) {
				return heroDbfId;
			}
		}

		const playerClass: string = this.allCards.getCard(card.id)?.playerClass;
		switch (playerClass) {
			case 'DemonHunter':
			case 'Demonhunter':
				return 56550;
			case 'Druid':
				return 274;
			case 'Hunter':
				return 31;
			case 'Mage':
				return 637;
			case 'Paladin':
				return 671;
			case 'Priest':
				return 813;
			case 'Rogue':
				return 930;
			case 'Shaman':
				return 1066;
			case 'Warlock':
				return 893;
			case 'Warrior':
				return 7;
			default:
				console.warn('Could not normalize hero card id', heroDbfId, heroCardId, playerClass, card);
				return 7;
		}
		// // This is the case for the non-standard heroes
		// if (isCharLowerCase(card.id.charAt(card.id.length - 1))) {
		// 	const canonicalHeroId = card.id.slice(0, -1);
		// 	// console.log('trying to find canonical hero card', card, canonicalHeroId);
		// 	const canonicalCard = this.allCards.getCard(canonicalHeroId);
		// 	if (canonicalCard) {
		// 		return canonicalCard.dbfId;
		// 	}
		// }
		// return heroDbfId;
	}
}
