import { AllCardsService } from '@firestone-hs/replay-parser';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class CardChangedInDeckParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.type === GameEvent.CARD_CHANGED_IN_DECK;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();

		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;

		const card = this.helper.findCardInZone(deck.deck, cardId, entityId, true);
		const previousDeck = deck.deck;
		const newDeck: readonly DeckCard[] = this.helper.removeSingleCardFromZone(
			previousDeck,
			cardId,
			entityId,
			deck.deckList.length === 0,
			true,
		)[0];
		// When card is changed in deck (eg Galakrond), a new card is created
		const cardData = cardId != null ? this.allCards.getCard(cardId) : null;
		const newCard = DeckCard.create({
			cardId: isPlayer ? cardId : undefined,
			entityId: entityId,
			cardName: cardData.name,
			manaCost: cardData ? cardData.cost : undefined,
			rarity: cardData && cardData.rarity ? cardData.rarity.toLowerCase() : undefined,
		} as DeckCard);
		const deckWithNewCard: readonly DeckCard[] = this.helper.addSingleCardToZone(newDeck, newCard);

		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			deck: deckWithNewCard,
		} as DeckState);
		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return GameEvent.CARD_CHANGED_IN_DECK;
	}
}
