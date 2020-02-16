import { CardIds } from '@firestone-hs/reference-data';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { BoardSecret } from '../../../../models/decktracker/board-secret';
import { DeckState } from '../../../../models/decktracker/deck-state';
import { GameState } from '../../../../models/decktracker/game-state';
import { GameEvent } from '../../../../models/game-event';
import { DeckManipulationHelper } from '../deck-manipulation-helper';
import { EventParser } from '../event-parser';

export class TriggerOnNumCardPlaySecretsParser implements EventParser {
	private secretsTriggeringOnAttack = [CardIds.Collectible.Hunter.RatTrap, CardIds.Collectible.Paladin.HiddenWisdom];

	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.gameState && gameEvent.type === GameEvent.NUM_CARDS_PLAYED_THIS_TURN;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, cardPlayedControllerId, localPlayer, entityId] = gameEvent.parse();
		const isPlayerWhoPlayedCard = cardPlayedControllerId === localPlayer.PlayerId;
		const deckWithSecretToCheck = isPlayerWhoPlayedCard ? currentState.opponentDeck : currentState.playerDeck;

		const toExclude = [];
		if (gameEvent.additionalData.cardsPlayed < 3) {
			toExclude.push(CardIds.Collectible.Hunter.RatTrap);
			toExclude.push(CardIds.Collectible.Paladin.HiddenWisdom);
		}
		if (deckWithSecretToCheck.board.length === 7) {
			toExclude.push(CardIds.Collectible.Hunter.RatTrap);
		}
		if (deckWithSecretToCheck.hand.length === 10) {
			toExclude.push(CardIds.Collectible.Paladin.HiddenWisdom);
		}
		const optionsToFlagAsInvalid = this.secretsTriggeringOnAttack.filter(
			secret => toExclude.indexOf(secret) === -1,
		);
		let secrets: BoardSecret[] = [...deckWithSecretToCheck.secrets];
		for (const secret of optionsToFlagAsInvalid) {
			// console.log('marking as invalid', secret, secrets);
			secrets = [...this.helper.removeSecretOptionFromSecrets(secrets, secret)];
			// console.log('marked as invalid', secret, newPlayerDeck);
		}
		let newPlayerDeck = deckWithSecretToCheck.update({
			secrets: secrets as readonly BoardSecret[],
		} as DeckState);
		return Object.assign(new GameState(), currentState, {
			[isPlayerWhoPlayedCard ? 'opponentDeck' : 'playerDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return 'SECRET_NUM_CARDS_PLAYED';
	}
}
