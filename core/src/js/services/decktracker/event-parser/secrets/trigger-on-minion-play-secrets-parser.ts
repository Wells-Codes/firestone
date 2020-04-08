import { CardIds, CardType } from '@firestone-hs/reference-data';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { BoardSecret } from '../../../../models/decktracker/board-secret';
import { DeckState } from '../../../../models/decktracker/deck-state';
import { GameState } from '../../../../models/decktracker/game-state';
import { GameEvent } from '../../../../models/game-event';
import { DeckManipulationHelper } from '../deck-manipulation-helper';
import { EventParser } from '../event-parser';

export class TriggerOnMinionPlaySecretsParser implements EventParser {
	private secretsTriggeringOnMinionPlay = [
		CardIds.Collectible.Hunter.HiddenCache,
		CardIds.Collectible.Hunter.Snipe,
		CardIds.Collectible.Mage.PotionOfPolymorph,
		CardIds.Collectible.Mage.MirrorEntity,
		CardIds.Collectible.Mage.FrozenClone,
		CardIds.Collectible.Mage.ExplosiveRunes,
		CardIds.Collectible.Paladin.Repentance,
		CardIds.Collectible.Paladin.SacredTrial,
		CardIds.Collectible.Rogue.Ambush,
	];

	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.gameState && gameEvent.type === GameEvent.CARD_PLAYED;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();
		const isMinionPlayedByPlayer = controllerId === localPlayer.PlayerId;
		const dbCard = this.allCards.getCard(cardId);
		if (!dbCard || !dbCard.type || dbCard.type.toLowerCase() !== CardType[CardType.MINION].toLowerCase()) {
			return currentState;
		}
		const deckWithSecretToCheck = isMinionPlayedByPlayer ? currentState.opponentDeck : currentState.playerDeck;

		const secretsWeCantRuleOut = [];
		// The only case where we can for sure know that the secret could be HiddenCache without
		// triggering is when there are no cards in hand. Otherwise, we're just guessing
		// We take the stance here that the most likely scenario is that the opponent has a
		// minion in hand (which is even more likely if they actually played HiddenCache)
		if (deckWithSecretToCheck.hand.length === 0) {
			secretsWeCantRuleOut.push(CardIds.Collectible.Hunter.HiddenCache);
		}

		const isBoardFull = deckWithSecretToCheck.board.length === 7;
		if (isBoardFull) {
			secretsWeCantRuleOut.push(CardIds.Collectible.Mage.MirrorEntity);
			secretsWeCantRuleOut.push(CardIds.Collectible.Rogue.Ambush);
		}

		const enemyBoard = (isMinionPlayedByPlayer ? currentState.playerDeck : currentState.opponentDeck).board;
		// console.log('enemy board', enemyBoard, isMinionPlayedByPlayer, currentState, gameEvent);
		if (enemyBoard.length < 3) {
			// console.log('ruling out sacred trial', enemyBoard);
			secretsWeCantRuleOut.push(CardIds.Collectible.Paladin.SacredTrial);
		}
		// TODO: handle the case where the max hand size has been bumped to 12
		const isHandFull = deckWithSecretToCheck.hand.length >= 10;
		if (isHandFull) {
			secretsWeCantRuleOut.push(CardIds.Collectible.Mage.Duplicate);
		}

		const optionsToFlagAsInvalid = this.secretsTriggeringOnMinionPlay.filter(
			secret => secretsWeCantRuleOut.indexOf(secret) === -1,
		);

		let secrets: BoardSecret[] = [...deckWithSecretToCheck.secrets];
		for (const secret of optionsToFlagAsInvalid) {
			// console.log('marking as invalid', secret, secrets);
			secrets = [...this.helper.removeSecretOptionFromSecrets(secrets, secret)];
			// console.log('marked as invalid', secret, newPlayerDeck);
		}
		const newPlayerDeck = deckWithSecretToCheck.update({
			secrets: secrets as readonly BoardSecret[],
		} as DeckState);
		return Object.assign(new GameState(), currentState, {
			[isMinionPlayedByPlayer ? 'opponentDeck' : 'playerDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return 'SECRET_MINION_PLAYED';
	}
}
