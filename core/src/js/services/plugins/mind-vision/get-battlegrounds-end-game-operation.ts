import { BattlegroundsInfo } from '../../../models/battlegrounds-info';
import { OverwolfService } from '../../overwolf.service';
import { MindVisionOperationFacade } from './mind-vision-operation-facade';
import { MindVisionService } from './mind-vision.service';

export class GetBattlegroundsEndGameOperation extends MindVisionOperationFacade<BattlegroundsInfo> {
	constructor(mindVision: MindVisionService, ow: OverwolfService) {
		super(
			ow,
			'getBattlegroundsInfo',
			() => mindVision.getBattlegroundsInfo(),
			battlegroundsInfo => battlegroundsInfo.Rating == -1 || battlegroundsInfo.NewRating == -1,
			battlegroundsInfo =>
				Object.assign(new BattlegroundsInfo(), {
					rating: battlegroundsInfo.Rating,
					newRating: battlegroundsInfo.NewRating,
					game: battlegroundsInfo.Game,
				} as BattlegroundsInfo),
			5,
			2000,
		);
	}
}
