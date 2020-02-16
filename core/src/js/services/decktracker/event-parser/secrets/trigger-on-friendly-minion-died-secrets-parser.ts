import { CardIds } from '@firestone-hs/reference-data';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { BoardSecret } from '../../../../models/decktracker/board-secret';
import { DeckState } from '../../../../models/decktracker/deck-state';
import { GameState } from '../../../../models/decktracker/game-state';
import { GameEvent } from '../../../../models/game-event';
import { DeckManipulationHelper } from '../deck-manipulation-helper';
import { EventParser } from '../event-parser';

export class TriggerOnFriendlyMinionDiedSecretsParser implements EventParser {
	private secretsTriggeringOnFriendlyMinionDeath = [
		CardIds.Collectible.Mage.Effigy,
		CardIds.Collectible.Mage.Duplicate,
		CardIds.Collectible.Paladin.GetawayKodo,
		CardIds.Collectible.Paladin.Redemption,
		CardIds.Collectible.Paladin.Avenge,
		CardIds.Collectible.Rogue.CheatDeath,
	];

	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.gameState && gameEvent.type === GameEvent.MINION_DIED;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, deadMinionControllerId, localPlayer, entityId] = gameEvent.parse();
		const activePlayerId = gameEvent.gameState.ActivePlayerId;
		if (activePlayerId === deadMinionControllerId) {
			return currentState;
		}

		const isPlayerWithDeadMinion = deadMinionControllerId === localPlayer.PlayerId;
		const deckWithSecretToCheck = isPlayerWithDeadMinion ? currentState.playerDeck : currentState.opponentDeck;
		const secretsWeCantRuleOut = [];

		// TODO: handle the case where the max hand size has been bumped to 12
		const isHandFull = deckWithSecretToCheck.hand.length >= 10;
		if (isHandFull) {
			secretsWeCantRuleOut.push(CardIds.Collectible.Mage.Duplicate);
			secretsWeCantRuleOut.push(CardIds.Collectible.Paladin.GetawayKodo);
			secretsWeCantRuleOut.push(CardIds.Collectible.Rogue.CheatDeath);
		}

		// If it's the only minion on board, we trigger nothing
		if (deckWithSecretToCheck.board.length === 1) {
			secretsWeCantRuleOut.push(CardIds.Collectible.Paladin.Avenge);
		}
		// TODO: Redemption will not trigger if deathrattles fill up the board

		const optionsToFlagAsInvalid = this.secretsTriggeringOnFriendlyMinionDeath.filter(
			secret => secretsWeCantRuleOut.indexOf(secret) === -1,
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
			[isPlayerWithDeadMinion ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return 'SECRET_FRIENDLY_MINION_DEATH';
	}
}
