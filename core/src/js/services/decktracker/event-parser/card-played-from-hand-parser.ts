import { AllCardsService } from '@firestone-hs/replay-parser';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { DeckEvents } from './deck-events';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class CardPlayedFromHandParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.type === GameEvent.CARD_PLAYED;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();

		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;
		const card = this.helper.findCardInZone(deck.hand, cardId, entityId);
		// console.log('[card-played-from-hand] card in zone', card, deck.hand, cardId, entityId);

		const [newHand, removedCard] = this.helper.removeSingleCardFromZone(
			deck.hand,
			cardId,
			entityId,
			deck.deckList.length === 0,
		);
		// console.log('removed card from hand', removedCard, currentState, gameEvent);
		const newDeck = this.helper.updateDeckForAi(gameEvent, currentState, removedCard);

		// Only minions end up on the board
		const refCard = this.allCards.getCard(cardId);
		const isOnBoard = refCard && refCard.type === 'Minion';
		const cardWithZone =
			card?.update({
				zone: isOnBoard ? 'PLAY' : null,
			} as DeckCard) ||
			DeckCard.create({
				entityId: entityId,
				cardId: cardId,
				cardName: refCard?.name,
				manaCost: refCard?.cost,
				rarity: refCard?.rarity?.toLowerCase(),
				zone: isOnBoard ? 'PLAY' : null,
			} as DeckCard);
		const newBoard: readonly DeckCard[] = isOnBoard
			? this.helper.addSingleCardToZone(deck.board, cardWithZone)
			: deck.board;
		const newOtherZone: readonly DeckCard[] = isOnBoard
			? deck.otherZone
			: this.helper.addSingleCardToZone(deck.otherZone, cardWithZone);
		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			hand: newHand,
			board: newBoard,
			deck: newDeck,
			otherZone: newOtherZone,
		});
		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return DeckEvents.CARD_PLAYED_FROM_HAND;
	}
}
