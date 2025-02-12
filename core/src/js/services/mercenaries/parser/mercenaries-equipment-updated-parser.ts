import { GameEvent } from '../../../models/game-event';
import { MainWindowState } from '../../../models/mainwindow/main-window-state';
import { BattleEquipment, MercenariesBattleState } from '../../../models/mercenaries/mercenaries-battle-state';
import { CardsFacadeService } from '../../cards-facade.service';
import { getMercCardLevel } from '../mercenaries-utils';
import { MercenariesParser } from './_mercenaries-parser';

export class MercenariesEquipmentUpdatedParser implements MercenariesParser {
	constructor(private readonly allCards: CardsFacadeService) {}

	public eventType = () => GameEvent.MERCENARIES_EQUIPMENT_UPDATE;

	public applies = (battleState: MercenariesBattleState) => battleState != null;

	public parse(
		battleState: MercenariesBattleState,
		event: GameEvent,
		mainWindowState: MainWindowState,
	): MercenariesBattleState | PromiseLike<MercenariesBattleState> {
		const [cardId, controllerId, localPlayer, entityId] = event.parse();
		if (!localPlayer) {
			console.error('[merc-equipment-updated-parser] no local player present', event);
			return battleState;
		}
		if (!cardId) {
			return battleState;
		}

		const ownerEntityId = event.additionalData.equipmentOwnerEntityId;
		const isPlayer = controllerId === localPlayer.PlayerId;
		const team = isPlayer ? battleState.playerTeam : battleState.opponentTeam;
		const equipmentOwner = team.getMercenary(ownerEntityId);
		if (!equipmentOwner) {
			console.warn('[merc-equipment-revealed-parser] missing owner', ownerEntityId);
			return battleState;
		}

		const newMerc = equipmentOwner.updateEquipment(
			entityId,
			BattleEquipment.create({
				entityId: entityId,
				cardId: cardId,
				level: getMercCardLevel(cardId),
			}),
		);
		const newTeam = team.updateMercenary(newMerc.entityId, newMerc);
		return battleState.update({
			playerTeam: isPlayer ? newTeam : battleState.playerTeam,
			opponentTeam: isPlayer ? battleState.opponentTeam : newTeam,
		} as MercenariesBattleState);
	}
}
