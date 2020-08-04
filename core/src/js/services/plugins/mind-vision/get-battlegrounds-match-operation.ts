import { BattlegroundsInfo } from '../../../models/battlegrounds-info';
import { OverwolfService } from '../../overwolf.service';
import { MindVisionOperationFacade } from './mind-vision-operation-facade';
import { MindVisionService } from './mind-vision.service';

export class GetBattlegroundsMatchOperation extends MindVisionOperationFacade<BattlegroundsInfo> {
	constructor(mindVision: MindVisionService, ow: OverwolfService) {
		super(
			ow,
			'getBattlegroundsMatch',
			() => mindVision.getBattlegroundsInfo(),
			battlegroundsInfo => !battlegroundsInfo?.Game?.Players || battlegroundsInfo.Game.Players.length === 0,
			battlegroundsInfo =>
				Object.assign(new BattlegroundsInfo(), {
					rating: battlegroundsInfo.Rating,
					game: battlegroundsInfo.Game,
				} as BattlegroundsInfo),
			5,
			2000,
		);
	}
}