import { Card } from '../../../models/card';
import { OverwolfService } from '../../overwolf.service';
import { SetsService } from '../../sets-service.service';
import { MindVisionOperationFacade } from './mind-vision-operation-facade';
import { MindVisionService } from './mind-vision.service';

export class GetCollectionOperation extends MindVisionOperationFacade<readonly Card[]> {
	private basicCards;

	constructor(mindVision: MindVisionService, ow: OverwolfService, private allCards: SetsService) {
		super(
			ow,
			'getCollection',
			() => mindVision.getCollection(),
			(memoryCollection: any[]) =>
				memoryCollection.length === 0 ||
				memoryCollection.every(entry => entry.Count + entry.PremiumCount === 0) ||
				// If there are no classic cards, we consider that the collection has not
				// been fetched from memory yet
				memoryCollection
					.filter(entry => this.getBasicCards().indexOf(entry.CardId) !== -1)
					.every(entry => entry.Count + entry.PremiumCount === 0),
			memoryCollection =>
				memoryCollection.map(
					memoryCard =>
						({
							id: memoryCard.CardId,
							count: memoryCard.Count,
							premiumCount: memoryCard.PremiumCount,
						} as Card),
				),
			20,
			5000,
		);
	}

	private getBasicCards() {
		if (this.basicCards) {
			return this.basicCards;
		}
		const basicCards = this.allCards.getSet('core').allCards.map(card => card.id);
		this.basicCards = basicCards;
		return this.basicCards;
	}
}
