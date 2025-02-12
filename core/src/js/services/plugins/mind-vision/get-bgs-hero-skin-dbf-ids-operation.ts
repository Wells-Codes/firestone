import { SetsService } from '../../collection/sets-service.service';
import { OverwolfService } from '../../overwolf.service';
import { MindVisionOperationFacade } from './mind-vision-operation-facade';
import { MindVisionService } from './mind-vision.service';

export class GetBattlegroundsOwnedHeroSkinDbfIdsOperation extends MindVisionOperationFacade<readonly number[]> {
	constructor(mindVision: MindVisionService, ow: OverwolfService, private allCards: SetsService) {
		super(
			ow,
			'getBattlegroundsOwnedHeroSkinDbfIds',
			() => mindVision.getBattlegroundsOwnedHeroSkinDbfIds(),
			(memoryCollection: any[]) => false,
			(memoryCollection) => memoryCollection,
			10,
			5000,
		);
	}
}
