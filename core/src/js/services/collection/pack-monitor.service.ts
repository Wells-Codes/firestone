import { Injectable } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { Key } from 'ts-keycode-enum';
import { InternalCardInfo } from '../../models/collection/internal-card-info';
import { Events } from '../../services/events.service';
import { GameEventsEmitterService } from '../game-events-emitter.service';
import { dustFor, dustForPremium } from '../hs-utils';
import { OverwolfService } from '../overwolf.service';
import { CardNotificationsService } from './card-notifications.service';

@Injectable()
export class PackMonitor {
	private unrevealedCards: CardWithEvents[] = [];
	private spacePressed: number;
	private totalDustInPack = 0;
	private totalDuplicateCards = 0;

	constructor(
		private events: Events,
		private cards: AllCardsService,
		private gameEvents: GameEventsEmitterService,
		private ow: OverwolfService,
		private notifications: CardNotificationsService,
	) {
		this.gameEvents.onGameStart.subscribe(() => {
			this.unrevealedCards = [];
		});

		this.events.on(Events.NEW_PACK).subscribe(async event => {
			console.log('[pack-monitor] resetting cards for new pack', event);
			const packCards: readonly InternalCardInfo[] = event.data[1];
			this.unrevealedCards = packCards.map(card => {
				const dbCard = this.cards.getCard(card.cardId);
				return {
					...card,
					event:
						card.isNew || card.isSecondCopy
							? async () =>
									this.notifications.createNewCardToast(card.cardId, card.isSecondCopy, card.cardType)
							: async () => {
									const dust =
										card.cardType === 'GOLDEN'
											? dustForPremium(dbCard.rarity)
											: dustFor(dbCard.rarity);
									this.totalDustInPack += dust;
									this.totalDuplicateCards++;
							  },
					revealed: false,
					eventTriggered: false,
				} as CardWithEvents;
			});

			this.spacePressed = 0;
			if (this.totalDustInPack > 0) {
				this.notifications.createDustToast(this.totalDustInPack, this.totalDuplicateCards);
				this.totalDustInPack = 0;
				this.totalDuplicateCards = 0;
			}
		});
		this.ow.addMouseUpListener(data => this.handleMouseUp(data));
		this.ow.addKeyUpListener(data => this.handleKeyUp(data));
	}

	private handleMouseUp(data) {
		if (this.unrevealedCards.length > 0 && data.onGame) {
			// console.debug('[pack-monitor] Detecting revealed cards', data, this.unrevealedCards);
			this.cardClicked(data, index => {
				this.detectRevealedCard(index);
			});
		}
	}

	// Prevent spamming
	private handlingKeyUp = false;
	private handleKeyUp(data) {
		if (this.handlingKeyUp) {
			setTimeout(() => this.handleKeyUp(data), 50);
			return;
		}
		if (this.unrevealedCards.length > 0 && data.onGame && parseInt(data.key) === Key.Space) {
			this.handlingKeyUp = true;
			this.spacePressed++;
			setTimeout(() => (this.handlingKeyUp = false), 50);
			// console.debug('space pressed', this.spacePressed, this.unrevealedCards);
			if (this.spacePressed !== this.unrevealedCards.length) {
				return;
			}

			for (let i = 0; i < this.unrevealedCards.length; i++) {
				this.revealCard(i);
			}
		}
	}

	private async cardClicked(data, callback: Function) {
		const result = await this.ow.getRunningGameInfo();
		const x = (1.0 * data.x) / result.logicalWidth;
		const y = (1.0 * data.y) / result.logicalHeight;

		// Top left
		let ret = -1;
		if (x <= 0.505 && y <= 0.52) {
			ret = 4;
		} else if (x >= 0.51 && x <= 0.65 && y <= 0.425) {
			ret = 2;
		} else if (x >= 0.66 && y <= 0.52) {
			ret = 3;
		} else if (x <= 0.56 && y >= 0.55) {
			ret = 0;
		} else if (x >= 0.59 && y >= 0.55) {
			ret = 1;
		} else {
			console.warn('[pack-monitor] Could not detect the clicked on card', x, y, data, result);
			return;
		}

		callback(ret);
	}

	private detectRevealedCard(i: number) {
		// card has been revealed already
		if (this.unrevealedCards[i].revealed || !this.unrevealedCards[i]) {
			return;
		}

		this.revealCard(i);
	}

	private async revealCard(i: number) {
		if (i === -1) {
			return;
		}
		this.unrevealedCards[i].revealed = true;
		const card = this.unrevealedCards[i];
		// console.debug('[pack-monitor] revealing card', card, this.unrevealedCards);
		if (!card.eventTriggered) {
			card.eventTriggered = true;
			await card.event();
		}
		if (this.unrevealedCards.some(card => !card.revealed)) {
			return;
		}

		// All cards have been revealed, full reset
		if (this.totalDustInPack > 0) {
			this.notifications.createDustToast(this.totalDustInPack, this.totalDuplicateCards);
			this.totalDustInPack = 0;
			this.totalDuplicateCards = 0;
		}
		this.unrevealedCards = [];
		console.log('[pack-monitor] reset done');
	}
}

interface CardWithEvents extends InternalCardInfo {
	event: () => Promise<void>;
	eventTriggered: boolean;
	revealed: boolean;
}
